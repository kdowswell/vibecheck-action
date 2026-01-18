import { z } from 'zod';
export declare const aiDetectorParams: z.ZodObject<{
    diff: z.ZodString;
    commitCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    diff: string;
    commitCount?: number | undefined;
}, {
    diff: string;
    commitCount?: number | undefined;
}>;
export type AIDetectorParams = z.infer<typeof aiDetectorParams>;
export declare function aiDetectorHandler(params: AIDetectorParams): Promise<string>;
//# sourceMappingURL=ai-detector.d.ts.map