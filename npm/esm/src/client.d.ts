import type { ApiClient, ApiClientConfig, ApiResourceConfig, Path, PathlessApiResourceConfig } from "./types.js";
export declare function zodApiClient<const T extends ApiClientConfig>(config: T): ApiClient<T>;
export declare function zodApiResource<const T1 extends Path, const T2 extends PathlessApiResourceConfig<T1>, const T3 extends ApiResourceConfig<T1, T2> = ApiResourceConfig<T1, T2>>(path: T1, config: T2): T3;
