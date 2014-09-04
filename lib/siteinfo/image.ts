// Functions for determining the type and size of an image

import collectionutil = require('../base/collectionutil');
import err_util = require('../base/err_util');

export enum ImageType {
	Png,
	Bmp,
	Jpeg
}

export interface ImageInfo {
	type: ImageType;
	width: number;
	height: number;
}

/** Error thrown if decoding metadata for a recognized image type fails.
  */
export class DecodeError extends err_util.BaseError {
	constructor(message: string) {
		super(message);
	}
}

var detectors: Array<(data: Uint8Array) => ImageInfo> = [];

// PNG
detectors.push((data) => {
	var PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
	if (collectionutil.compare(data, PNG_SIG, PNG_SIG.length) != 0) {
		return null;
	}

	var headerStart = PNG_SIG.length;
	var chunkType = data.subarray(headerStart + 4, headerStart + 8);
	if (collectionutil.stringFromBuffer(chunkType) != 'IHDR') {
		throw new DecodeError('Missing IHDR chunk');
	}

	var dataView = new DataView(data.buffer, data.byteOffset);
	var width = dataView.getUint32(headerStart + 8);
	var height = dataView.getUint32(headerStart + 12);

	return {
		type: ImageType.Png,
		width: width,
		height: height
	};
});

// JPEG
detectors.push((data) => {
	var JPEG_SIG = [0xFF, 0xD8];
	if (collectionutil.compare(data, JPEG_SIG, JPEG_SIG.length) != 0) {
		return null;
	}
	
	var segmentInfo = new DataView(data.buffer, data.byteOffset);
	var segmentStart = 2;

	while (true) {
		if (segmentInfo.getUint8(segmentStart) != 0xFF) {
			// invalid segment marker
			throw new DecodeError('Invalid segment type');
		}

		var segmentType = segmentInfo.getUint8(segmentStart + 1);
		var segmentLength = segmentInfo.getUint16(segmentStart + 2);
		
		var isStartOfFrame = segmentType >= 0xC0 && segmentType <= 0xCF &&
		                     segmentType != 0xC4 && segmentType != 0xC8 && segmentType != 0xCC;
		if (!isStartOfFrame) {
			segmentStart = segmentStart + 2 + segmentLength;
			continue;
		}

		// SOF[0-15] - Start of Frame Segment
		// - Marker 0xFF, 0xC0 (2)
		// - Length (2)
		// - Data Precision (1)
		// - Image Height (2)
		// - Image Width (2)
		var width = segmentInfo.getUint16(segmentStart + 5);
		var height = segmentInfo.getUint16(segmentStart + 7);

		return {
			type: ImageType.Jpeg,
			width: width,
			height: height
		};
	}
});

// BMP
detectors.push((data) => {
	// bitmap files start with a BITMAPFILEHEADER struct, followed
	// by a BITMAPINFOHEADER struct.
	//
	// See comments in ico.ts
	var BMP_SIG = [0x42, 0x4D];
	if (collectionutil.compare(data, BMP_SIG, BMP_SIG.length) != 0) {
		return null;
	}

	var FILE_HEADER_LENGTH = 14;

	var bmpInfoHeader = new collectionutil.LittleEndianDataView(
	  new DataView(data.buffer, data.byteOffset + FILE_HEADER_LENGTH)
	);
	var biSize = bmpInfoHeader.getUint32(0);
	if (biSize != 40 /* sizeof(BITMAPINFOHEADER) */) {
		throw new DecodeError('Unsupported bitmap type: ' + biSize);
	}
	var biWidth = bmpInfoHeader.getInt32(4);
	var biHeight = bmpInfoHeader.getInt32(8);

	return {
		type: ImageType.Bmp,
		width: biWidth,
		height: biHeight
	};
});

/** Detects the image type and size of the data in @p data.
  * Returns the image metadata if successfully detected or
  * null if there is no match.
  *
  * Throws DecodeError if the image type is recognized but cannot
  * be decoded.
  */
export function getInfo(data: Uint8Array) : ImageInfo {
	for (var i=0; i < detectors.length; i++) {
		var info = detectors[i](data);
		if (info) {
			return info;
		}
	}
	return null;
}

/** Returns the MIME type string for a given image type */
export function mimeType(type: ImageType) : string {
	switch (type) {
		case ImageType.Png:
			return 'image/png';
		case ImageType.Bmp:
			return 'image/bmp';
		case ImageType.Jpeg:
			return 'image/jpeg';
		default:
			return 'application/octet-stream';
	}
}

