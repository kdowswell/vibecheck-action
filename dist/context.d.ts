import { PRContext, Config } from './types';
export declare function getConfig(): Config;
export declare function getPRContext(): Promise<PRContext | null>;
export declare function shouldSkip(context: PRContext, config: Config): {
    skip: boolean;
    reason?: string;
};
//# sourceMappingURL=context.d.ts.map