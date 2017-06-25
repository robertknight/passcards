import { createFactory, HTMLFactory, SVGFactory } from 'react';

export const button = createFactory('button') as HTMLFactory<HTMLButtonElement>;
export const canvas = createFactory('canvas') as HTMLFactory<HTMLCanvasElement>;
export const div = createFactory('div');
export const form = createFactory('form') as HTMLFactory<HTMLFormElement>;
export const img = createFactory('img') as HTMLFactory<HTMLImageElement>;
export const input = createFactory('input') as HTMLFactory<HTMLInputElement>;
export const svg = createFactory('svg') as SVGFactory;
