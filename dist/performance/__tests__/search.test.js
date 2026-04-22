/**
 * Search Performance Tests
 */
import { buildCharBitmap, buildQueryBitmap, couldMatch, calculateScore, searchFiles, } from '../search.js';
describe('Search Bitmap Functions', () => {
    test('buildCharBitmap creates correct mask', () => {
        const bitmap = buildCharBitmap('abc');
        expect(bitmap).toBe(0b00000000000000000000000111); // bits 0, 1, 2
    });
    test('buildCharBitmap ignores non-lowercase', () => {
        const bitmap = buildCharBitmap('ABC-123!');
        expect(bitmap).toBe(0); // No lowercase letters
    });
    test('couldMatch returns true for matching bitmaps', () => {
        const pathBitmap = buildCharBitmap('src/components/Button.tsx');
        const queryBitmap = buildQueryBitmap('btn');
        expect(couldMatch(pathBitmap, queryBitmap)).toBe(true);
    });
    test('couldMatch returns false for missing characters', () => {
        const pathBitmap = buildCharBitmap('src/main.ts');
        const queryBitmap = buildQueryBitmap('xyz'); // Not in path
        expect(couldMatch(pathBitmap, queryBitmap)).toBe(false);
    });
});
describe('Search Scoring', () => {
    test('calculateScore rewards basename matches', () => {
        const positions = [{ start: 4, end: 8 }];
        const score = calculateScore('src/utils/logger.ts', 'logger', positions);
        expect(score).toBeGreaterThan(0);
    });
    test('calculateScore rewards consecutive matches', () => {
        const positions = [
            { start: 0, end: 1 },
            { start: 1, end: 2 }, // Consecutive
        ];
        const score = calculateScore('abcdef', 'ab', positions);
        expect(score).toBeGreaterThan(10); // Consecutive bonus
    });
});
describe('Search Files', () => {
    const files = [
        'src/components/Button.tsx',
        'src/components/Input.tsx',
        'src/utils/logger.ts',
        'src/utils/helpers.ts',
        'README.md',
    ];
    test('searchFiles returns results', () => {
        const results = searchFiles(files, 'button', 10);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].path).toContain('Button');
    });
    test('searchFiles respects maxResults', () => {
        const results = searchFiles(files, 'src', 2);
        expect(results.length).toBeLessThanOrEqual(2);
    });
    test('searchFiles handles no matches', () => {
        const results = searchFiles(files, 'xyz123', 10);
        expect(results.length).toBe(0);
    });
});
//# sourceMappingURL=search.test.js.map