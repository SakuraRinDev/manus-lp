import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

// 1. Read the GAS source code
const gasCode = fs.readFileSync(path.join(__dirname, '../google-apps-script.js'), 'utf8');

// 2. Mock GAS Global Environment
const makeContext = () => {
    const context = {
        console: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
        Utilities: {
            base64Encode: vi.fn((bytes) => 'MOCK_BASE64_' + bytes),
        },
        PropertiesService: {
            getScriptProperties: vi.fn(() => ({
                getProperty: vi.fn((key) => {
                    if (key === 'OPENROUTER_API_KEY') return 'sk-mock-key';
                    return null;
                }),
            })),
        },
        UrlFetchApp: {
            fetch: vi.fn(),
        },
        DriveApp: {
            getFileById: vi.fn(),
            getFolderById: vi.fn(),
            Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
            Permission: { VIEW: 'VIEW' },
        },
        SpreadsheetApp: {
            getActiveSpreadsheet: vi.fn(),
            flush: vi.fn(),
        },
        ContentService: {
            createTextOutput: vi.fn(() => ({
                setMimeType: vi.fn(),
                setContent: vi.fn(),
            })),
            MimeType: { JSON: 'JSON' },
        },
        ScriptApp: {
            getProjectTriggers: vi.fn(() => []),
            deleteTrigger: vi.fn(),
            newTrigger: vi.fn(() => ({
                forSpreadsheet: vi.fn(() => ({
                    onEdit: vi.fn(() => ({ create: vi.fn() })),
                    onFormSubmit: vi.fn(() => ({ create: vi.fn() })),
                })),
                timeBased: vi.fn(() => ({
                    everyMinutes: vi.fn(() => ({ create: vi.fn() })),
                })),
            })),
        },
        // Mock Session/Browser if needed (not used in this logic much)
        // Add defined CONFIG if it's not global (it is global in the file)
    };
    return context;
};

// 3. Helper to execute GAS function in context
const runInGasContext = (fnName, args = [], contextOverrides = {}) => {
    const context = { ...makeContext(), ...contextOverrides };
    vm.createContext(context);
    vm.runInContext(gasCode, context);

    // Setup CONFIG (since it's a const, it might need to be accessed via context)
    // The code runs top-level, so CONFIG is defined in context.

    if (typeof context[fnName] !== 'function') {
        throw new Error(`Function ${fnName} not found in GAS code.`);
    }
    return {
        result: context[fnName](...args),
        context: context
    };
};

describe('Google Apps Script Logic', () => {

    describe('Utilities: mapCategory', () => {
        it('should map known categories correctly', () => {
            const { context } = runInGasContext('mapCategory', ['apps']); // Initialize context
            const mapCategory = context.mapCategory;

            expect(mapCategory('Apps & Tools')).toBe('apps');
            expect(mapCategory('Documents')).toBe('documents');
            expect(mapCategory('Data & Analysis')).toBe('data');
            expect(mapCategory('Creative')).toBe('creative');
        });

        it('should map unknown categories to "others"', () => {
            const { context } = runInGasContext('mapCategory', ['xxx']);
            const mapCategory = context.mapCategory;
            expect(mapCategory('Unknown Category')).toBe('others');
        });
    });

    describe('Compliance Check: executeOpenRouterCheck', () => {
        it('should return COMPLIANT when API returns is_compliant: true', () => {
            const mockApiResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            is_compliant: true,
                            risk_level: "LOW",
                            category: "NONE",
                            reason: "Safe"
                        })
                    }
                }]
            };

            const contextOverrides = makeContext();
            contextOverrides.UrlFetchApp.fetch.mockReturnValue({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify(mockApiResponse)
            });

            const row = [];
            // Assuming default indexes: TITLE=3, DESCRIPTION=5, etc. from code default CONFIG
            // We can read CONFIG from context, but easier to just mock row array big enough
            row[3] = 'Safe Title';
            row[5] = 'Safe Description';
            row[6] = ''; // No image
            row[7] = ''; // No URL

            const { result } = runInGasContext('executeOpenRouterCheck', [row], contextOverrides);

            expect(result.is_compliant).toBe(true);
            expect(result.risk_level).toBe("LOW");
        });

        it('should handle FLAGGED content', () => {
            const mockApiResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            is_compliant: false,
                            risk_level: "HIGH",
                            category: "ADULT",
                            reason: "Unsafe"
                        })
                    }
                }]
            };

            const contextOverrides = makeContext();
            contextOverrides.UrlFetchApp.fetch.mockReturnValue({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify(mockApiResponse)
            });

            const row = [];
            row[3] = 'Unsafe Title';

            const { result } = runInGasContext('executeOpenRouterCheck', [row], contextOverrides);

            expect(result.is_compliant).toBe(false);
            expect(result.category).toBe("ADULT");
        });

        it('should handle malformed JSON response securely (Fallback to FLAGGED)', () => {
            const mockApiResponse = {
                choices: [{
                    message: {
                        content: "This is not JSON. I cannot answer."
                    }
                }]
            };

            const contextOverrides = makeContext();
            contextOverrides.UrlFetchApp.fetch.mockReturnValue({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify(mockApiResponse)
            });

            const row = [];
            row[3] = 'Tricky Content';

            const { result } = runInGasContext('executeOpenRouterCheck', [row], contextOverrides);

            expect(result.is_compliant).toBe(false);
            expect(result.reason).toContain('不正な形式');
        });
    });

    describe('Workflow: checkComplianceForPendingRows', () => {
        it('should update spreadsheet with Check Result and Auto-Approve if compliant', () => {
            // Mock Spreadsheet Structure
            const mockSheet = {
                getDataRange: vi.fn(() => ({
                    getValues: () => [
                        ['Header'], // Row 0
                        ['TIMESTAMP', 'USER', 'TWITTER', 'Safe Title', 'CAT', 'DESC', '', '', '', '', '', '', ''] // Row 1 (Index 1)
                    ]
                })),
                getRange: vi.fn((row, col) => ({
                    setValue: vi.fn()
                }))
            };

            const contextOverrides = makeContext();
            contextOverrides.SpreadsheetApp.getActiveSpreadsheet.mockReturnValue({
                getActiveSheet: () => mockSheet,
                getSheets: () => [mockSheet] // For getApprovedWorks fix
            });

            // Mock API to return Compliant
            const mockApiResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            is_compliant: true,
                            risk_level: "LOW",
                            category: "NONE",
                            reason: "Safe"
                        })
                    }
                }]
            };
            contextOverrides.UrlFetchApp.fetch.mockReturnValue({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify(mockApiResponse)
            });

            // Mock DriverApp for auto-approval copy
            const mockFile = {
                makeCopy: vi.fn(() => ({
                    setSharing: vi.fn(),
                    getId: () => 'new_file_id',
                    getName: () => 'file'
                })), getBlob: vi.fn(), getName: () => 'file'
            };
            contextOverrides.DriveApp.getFileById.mockReturnValue(mockFile);
            contextOverrides.DriveApp.getFolderById.mockReturnValue({});

            // Run
            runInGasContext('checkComplianceForPendingRows', [], contextOverrides);

            // Verification
            // Row 1 is data[1]. i=1. Row index in getRange is i+1 = 2.
            // STATUS column is 9 (J). getRange(2, 10) should be APPROVED.
            // COMPLIANCE_RESULT is 11 (L). getRange(2, 12) should be COMPLIANT.

            // Check calls to setValue
            // We can check the mock history of getRange calls
            // Or better, we can assume the mock returned strict objects and spy on them if we structured it that way.
            // Since we return a fresh object on every getRange call in the mock above (`{ setValue: vi.fn() }`), we can't easily spy on the *returned* object unless we store it.

            // Let's refine the mock for spying
            const cellMocks = {};
            const getCellMock = (r, c) => {
                const key = `${r}-${c}`;
                if (!cellMocks[key]) cellMocks[key] = { setValue: vi.fn() };
                return cellMocks[key];
            };

            mockSheet.getRange.mockImplementation((r, c) => getCellMock(r, c));

            // Re-run with refined mock
            runInGasContext('checkComplianceForPendingRows', [], contextOverrides);

            // 1. Check Compliance Result (Col 12 -> L)
            expect(cellMocks['2-12'].setValue).toHaveBeenCalledWith('COMPLIANT');

            // 2. Check Auto Approval (Col 10 -> J)
            expect(cellMocks['2-10'].setValue).toHaveBeenCalledWith('APPROVED');

        });
    });

});
