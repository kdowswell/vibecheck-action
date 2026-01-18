import { PRContext, VibeReport } from './types';
export declare function postVibeReport(context: PRContext, report: VibeReport): Promise<void>;
export declare function postInteractiveResponse(context: PRContext, response: string): Promise<void>;
export declare function parseVibeReport(content: string): VibeReport;
//# sourceMappingURL=post.d.ts.map