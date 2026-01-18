import { z } from 'zod';
export declare const securityScanParams: z.ZodObject<{
    code: z.ZodString;
    filename: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    filename?: string | undefined;
    language?: string | undefined;
}, {
    code: string;
    filename?: string | undefined;
    language?: string | undefined;
}>;
export type SecurityScanParams = z.infer<typeof securityScanParams>;
export declare function securityScanHandler(params: SecurityScanParams): Promise<string>;
//# sourceMappingURL=security.d.ts.map