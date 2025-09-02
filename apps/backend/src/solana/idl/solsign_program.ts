/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solsign_program.json`.
 */
export type SolsignProgram = {
  address: "2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2";
  metadata: {
    name: "solsignProgram";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "mintDocNft";
      docs: [
        "Creates a new DocNft account and initializes it with document metadata.",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context containing all necessary accounts.",
        "* `doc_sha256` - The 32-byte SHA-256 hash of the document content.",
        "* `arweave_tx` - A 43-character string for the Arweave transaction ID.",
        "* `parties` - A vector of public keys for the signing parties.",
        "* `signed_at` - A Unix timestamp of when the document was finalized.",
      ];
      discriminator: [232, 177, 63, 155, 111, 246, 130, 70];
      accounts: [
        {
          name: "docNft";
          docs: [
            "This is the new account we are creating for the DocNFT.",
            "`init`:       Tells Anchor to create this account.",
            "`payer`:      Specifies that the `authority` account will pay for the rent.",
            "`space`:      Defines how much space to allocate, using our `LEN` constant.",
          ];
          writable: true;
          signer: true;
        },
        {
          name: "authority";
          docs: [
            "This is the user who is calling the instruction.",
            "`mut`:        Indicates that this account's SOL balance will be mutated (debited for rent).",
            "`Signer`:     Enforces that this account must have signed the transaction.",
          ];
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          docs: [
            "The System Program is a native Solana program required for creating new accounts.",
            "Anchor handles passing this in for us.",
          ];
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "docSha256";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "arweaveTx";
          type: "string";
        },
        {
          name: "parties";
          type: {
            vec: "pubkey";
          };
        },
        {
          name: "signedAt";
          type: "i64";
        },
      ];
    },
  ];
  accounts: [
    {
      name: "docNft";
      discriminator: [199, 39, 114, 50, 218, 211, 229, 196];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "invalidArweaveTx";
      msg: "The provided Arweave transaction ID must be 43 characters long.";
    },
    {
      code: 6001;
      name: "noParties";
      msg: "The document must have at least one signing party.";
    },
  ];
  types: [
    {
      name: "docNft";
      docs: [
        "Defines the structure of the on-chain account that stores DocNFT metadata.",
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: [
              "The user who has authority over this DocNFT account (the document owner).",
            ];
            type: "pubkey";
          },
          {
            name: "docSha256";
            docs: [
              "The immutable SHA-256 hash of the document content.",
              "We use a fixed-size array for efficiency, as SHA-256 is always 32 bytes.",
            ];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "arweaveTx";
            docs: [
              "The transaction ID from Arweave where the final PDF is stored.",
              "We limit its size in the `LEN` constant below.",
            ];
            type: "string";
          },
          {
            name: "parties";
            docs: [
              "A list of all parties who signed the document.",
              "For the MVP, this will just be the document owner.",
            ];
            type: {
              vec: "pubkey";
            };
          },
          {
            name: "signedAt";
            docs: [
              "The Unix timestamp of when the document was finalized and signed.",
            ];
            type: "i64";
          },
        ];
      };
    },
  ];
};
