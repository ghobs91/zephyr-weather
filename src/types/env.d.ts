/**
 * Types for build-time environment variables injected by
 * `react-native-dotenv` (see `.env.example`).
 *
 * Every value is optional: with no `.env` file the plugin substitutes
 * `undefined`, and providers that need a key disable themselves.
 */
declare module '@env' {
  export const KNMI_API_KEY: string | undefined;
  export const METEOFRANCE_API_KEY: string | undefined;
  export const AEMET_API_KEY: string | undefined;
  export const KMA_API_KEY: string | undefined;
  export const CWA_API_KEY: string | undefined;
  export const METEOALARM_API_KEY: string | undefined;
}
