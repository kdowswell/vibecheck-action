import { securityScanHandler } from './security';
import { aiDetectorHandler } from './ai-detector';
import { testCoverageHandler } from './test-coverage';
import { complexityHandler } from './complexity';
import { Config } from '../types';
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: any;
    handler: (params: any) => Promise<string>;
}
export declare function getTools(config: Config): ToolDefinition[];
export { securityScanHandler, aiDetectorHandler, testCoverageHandler, complexityHandler, };
//# sourceMappingURL=index.d.ts.map