// Basic interfaces for field types used in RPC messages between
// the passcards front-end and browser extension code running
// in the context of the target page

// NOTE: This module contains only basic type definitions and
// no external dependencies for easier re-use across different
// JS environments.

export enum FieldType {
	Text,
	Password,
	Email,
	Other
}

export interface InputField {
	key: any;
	type: FieldType;

	id?: string;
	name?: string;
	ariaLabel?: string;
	placeholder?: string;
}

export interface AutoFillEntry {
	key: any;
	value: string;
}


