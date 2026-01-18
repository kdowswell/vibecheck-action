import { z } from 'zod';
export declare const testCoverageParams: z.ZodObject<{
    changedFiles: z.ZodArray<z.ZodString, "many">;
    diff: z.ZodString;
}, "strip", z.ZodTypeAny, {
    diff: string;
    changedFiles: string[];
}, {
    diff: string;
    changedFiles: string[];
}>;
export type TestCoverageParams = z.infer<typeof testCoverageParams>;
export declare function testCoverageHandler(params: TestCoverageParams): Promise<string>;
//# sourceMappingURL=test-coverage.d.ts.map