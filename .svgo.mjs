export default {
  multipass: true,
  // floatPrecision 0 keeps logo paths brand-correct at favicon/OG render sizes
  // while collapsing the multi-decimal source coordinates that ballooned the
  // unminified files.
  floatPrecision: 0,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUnknownsAndDefaults: false,
        }
      }
    },
    'removeMetadata',
    {
      name: 'removeComments',
      params: {
        // Preserve canonical-treatment markers checked by verify-static.mjs.
        preservePatterns: [/Approved OpenCoven/],
      },
    },
    'removeEmptyContainers',
  ]
};
