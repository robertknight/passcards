// Functions for extracting the size and data of individual icons in a .ico
// file

// .ico file format reference: http://msdn.microsoft.com/en-us/library/ms997538.aspx
// and http://en.wikipedia.org/wiki/ICO_(file_format)

import collectionutil = require('../base/collectionutil');

/*
C struct definitions:

typedef struct
{
   WORD           idReserved;   // Reserved (must be 0)
   WORD           idType;       // Resource Type (1 for icons)
   WORD           idCount;      // How many images?
   ICONDIRENTRY   idEntries[1]; // An entry for each image (idCount of 'em)
} ICONDIR, *LPICONDIR;

typedef struct
{
    BYTE        bWidth;          // Width, in pixels, of the image
    BYTE        bHeight;         // Height, in pixels, of the image
    BYTE        bColorCount;     // Number of colors in image (0 if >=8bpp)
    BYTE        bReserved;       // Reserved ( must be 0)
    WORD        wPlanes;         // Color Planes
    WORD        wBitCount;       // Bits per pixel
    DWORD       dwBytesInRes;    // How many bytes in this resource?
    DWORD       dwImageOffset;   // Where in the file is this image?
} ICONDIRENTRY, *LPICONDIRENTRY;

*/

export interface Icon {
	/** The width of the icon in pixels */
	width: number;
	/** The height of the icon in pixels */
	height: number;
	/** The icon's data as a BMP or PNG file */
	data: Uint8Array;
}

// creates a BITMAPFILEHEADER struct for data from a .bmp file
// see http://en.wikipedia.org/wiki/BMP_file_format#Bitmap_file_header
//
// 'data' is the contents of a bitmap file, excluding the BITMAPFILEHEADER struct
// at the beginning
function bitmapFileHeader(data: Uint8Array): Uint8Array {
	var srcDataView = new DataView(data.buffer);
	var biSize = srcDataView.getUint32(data.byteOffset, true /* little-endian */);

	var HEADER_SIZE = 14;
	var header = new Uint8Array(HEADER_SIZE);
	var headerDataView = new DataView(header.buffer);

	// 'BM'
	headerDataView.setUint8(0, 0x42);
	headerDataView.setUint8(1, 0x4D);

	headerDataView.setUint32(2, data.byteLength + HEADER_SIZE, true /* little-endian */);

	// offset of bitmap data from start of file
	headerDataView.setUint32(10, HEADER_SIZE + biSize, true /* little-endian */);

	return header;
}

/** Returns true if the buffer contains a .ico file. */
export function isIco(data: Uint8Array): boolean {
	return data.length > 4 &&
	       data[0] === 0 && data[1] === 0 &&
	       data[2] === 1 && data[3] === 0;
}

var ICON_DIR_SIZE = 6;
var ICON_DIR_ENTRY_SIZE = 16;

function readNthIcon(leData: collectionutil.LittleEndianDataView, index: number): Icon {
	// read icon entry header
	var offset = ICON_DIR_SIZE + index * ICON_DIR_ENTRY_SIZE;

	var width = leData.getUint8(offset);
	var height = leData.getUint8(offset + 1);
	var imageDataLength = leData.getUint32(offset + 8);
	var imageDataOffset = leData.getUint32(offset + 12);

	if (width == 0 || height == 0) {
		throw new Error(`Invalid bitmap size (${width}x${height})`);
	}
	if (imageDataOffset + imageDataLength > leData.byteLength) {
		throw new Error(`Invalid bitmap data offset (${imageDataOffset}..${imageDataOffset + imageDataLength} of ${leData.byteLength})`);
	}

	// read bitmap data -
	// the bitmap data format is the same as a .bmp file except:
	//
	// 1) The BITMAPFILEHEADER struct is not present
	// 2) Following the normal bitmap data is a 1bpp mask image
	//    to be AND-ed with the destination before XOR-ing
	//    the bitmap color data
	// 3) The image height is given as the combined height of the
	//    color data and the mask - so 2x the height of the bitmap
	var sourceData = new Uint8Array(leData.buffer, imageDataOffset, imageDataLength);
	
	// check BITMAPFILEINFO header for the bitmap
	// see http://msdn.microsoft.com/en-gb/library/windows/desktop/dd183376%28v=vs.85%29.aspx
	var biSize = leData.getUint32(imageDataOffset);
	if (biSize != 40 /* sizeof(BITMAPINFOHEADER) */) {
		throw new Error(`Unsupported bitmap format. Header size ${biSize}`);
	}

	var biHeight = leData.getInt32(imageDataOffset + 8);
	if (biHeight != height * 2) {
		throw new Error(`Unexpected bitmap height (${biHeight}px)`);
	}

	var BI_RGB = 0;
	var biCompression = leData.getUint32(imageDataOffset + 16);
	if (biCompression != BI_RGB) {
		throw new Error(`Unsupported bitmap compression type ${biCompression}`);
	}

	var bmpFileHeader = bitmapFileHeader(sourceData);
	var imageData = new Uint8Array(bmpFileHeader.byteLength + imageDataLength);
	imageData.set(bmpFileHeader);
	imageData.set(sourceData, bmpFileHeader.byteLength);

	var leImageData = new collectionutil.LittleEndianDataView(new DataView(imageData.buffer));

	// adjust the image height. In the original header it is the combined
	// height of the mask and the color data. In the exported BMP-format
	// data, the mask is not present
	leImageData.setInt32(bmpFileHeader.byteLength + 8, height);

	// set image data size to 0, it is inferred from the image size
	// and color depth
	leImageData.setUint32(bmpFileHeader.byteLength + 34, 0);

	return {
		width: width,
		height: height,
		data: imageData
	};
}

/** Reads a .ico file containing one or more icons and returns
  * an array of the icons found.
  */
export function read(data: DataView): Icon[] {
	var leData = new collectionutil.LittleEndianDataView(data);

	if (leData.getUint16(0) !== 0 || leData.getUint16(2) !== 1) {
		throw new TypeError('Not a .ico file');
	}

	var icons: Icon[] = [];
	var imageCount = leData.getUint16(4);

	for (var i = 0; i < imageCount; i++) {
		try {
			icons.push(readNthIcon(leData, i));
		} catch (ex) {
			console.log('Skipping invalid icon: ', ex.message);
		}
	}

	return icons;
}

