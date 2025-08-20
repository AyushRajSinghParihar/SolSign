declare module 'tiny-sha256' {
  function sha256(data: Buffer | Uint8Array | string): Uint8Array;
  export = sha256;
}