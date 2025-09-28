declare module 'tiny-sha256' {
  function sha256(input: string | Uint8Array): string;
  export = sha256;
}