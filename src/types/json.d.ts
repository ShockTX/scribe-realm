/**
 * The SRD data files are ~1.7MB. Letting TypeScript infer literal types from
 * them makes `tsc` hang for minutes. We declare them as `unknown` and cast at
 * the single boundary in rules/srd.ts, which is where the real types live.
 */
declare module "*.json" {
  const value: unknown;
  export default value;
}
