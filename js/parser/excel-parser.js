/**
 * excel-parser.js
 * Dynamic inference engine compatible with Excel (.xlsx) and Comtrade (.csv) exports.
 * Features delimiter auto-correction (';', ',', '\t'), 25-row header scanning,
 * and international number normalization (PT-BR / DE / US).
 */
export class ExcelParser {
    constructor() {
        this.keywordDictionaries = {
            period: ['period', 'year', 'refyear', 'yr', 'ano', 'time', 'periodo', 'perioddesc', 'anoref'],
            reporterISO: ['reporteriso', 'reportercode', 'rt3iso', 'reporter', 'reporterid', 'origemiso', 'reporteriso3', 'reporterisocode', 'paisreportador', 'origem'],
            reporterDesc: ['reporterdesc', 'reportername', 'reporter', 'paisreportador', 'origem', 'reporterdescription', 'reportercountry', 'reportardesc'],
            partnerISO: ['partneriso', 'partnercode', 'pt3iso', 'partner', 'partnerid', 'destinoiso', 'partneriso3', 'partnerisocode', 'partner2iso', 'partner2code', 'paisparceiro', 'destino'],
            partnerDesc: ['partnerdesc', 'partnername', 'partner', 'paisparceiro', 'destino', 'partnerdescription', 'partnercountry', 'parceirodesc'],
            flowCode: ['flowcode', 'flow', 'tradeflow', 'fluxocode', 'fluxo', 'flowid', 'flowtype', 'tradeflowcode', 'flowdesc', 'tradeflowdesc', 'sentido'],
            cmdCode: ['cmdcode', 'commoditycode', 'hscode', 'cmd', 'codigohs', 'classificationcode', 'customscode', 'commodity', 'hs', 'commodityid', 'commoditycodehs', 'hscode4', 'hscode6', 'posicaohs'],
            cmdDesc: ['cmddesc', 'commoditydesc', 'hsdesc', 'commodity', 'descmercadoria', 'customsdesc', 'description', 'commoditydescription', 'cmddescription', 'mercadoria'],
            netWgt: ['netwgt', 'netweight', 'weight', 'pesoliquido', 'netwgtkg', 'qty', 'quantity', 'peso', 'netweightkg', 'netwgtin', 'netweightinkg', 'netmass', 'netmasskg', 'altqty', 'grosswgt', 'volume', 'massa'],
            tradeValue: ['tradevalue', 'primaryvalue', 'value', 'valor', 'tradevalueusd', 'fobvalue', 'cifvalue', 'valorusd', 'tradevalueus', 'tradevalin', 'tradevalueinuse', 'valueinuse', 'valueinusd', 'tradevalueinusd', 'totalvalue', 'val', 'montante']
        };
    }

    async parseFile(file, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = await this.parseBuffer(e.target.result, file.name, onProgress);
                    resolve(result);
                } catch (error) { reject(error); }
            };
            reader.onerror = () => reject(new Error('I/O error reading local file.'));
            reader.readAsArrayBuffer(file);
        });
    }

    async parseBuffer(buffer, fileName = "Comtrade Dataset", onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            try {
                onProgress(`Inspecting binary structure of "${fileName}"...`);
                const data = new Uint8Array(buffer);
                const workbook = XLSX.read(data, { type: 'array', raw: false });

                const allRecords = [];
                const metadata = {
                    years: new Set(), reporters: new Map(), partners: new Map(),
                    commodities: new Map(), flows: new Set(), schemaMapping: null
                };

                workbook.SheetNames.forEach((sheetName, index) => {
                    onProgress(`Scanning Sheet ${index + 1}/${workbook.SheetNames.length}: "${sheetName}"...`);
                    const worksheet = workbook.Sheets[sheetName];
                    let rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    if (!rawData || rawData.length < 2) return;

                    // Delimiter Auto-Correction for European / South American CSV exports
                    if (rawData[0].length === 1 && typeof rawData[0][0] === 'string') {
                        const firstLine = rawData[0][0];
                        let delimiter = null;
                        if (firstLine.includes(';')) delimiter = ';';
                        else if (firstLine.includes('\t')) delimiter = '\t';
                        else if (firstLine.includes(',') && firstLine.split(',').length > 3) delimiter = ',';

                        if (delimiter) {
                            rawData = rawData.map(row => {
                                if (row && typeof row[0] === 'string') {
                                    return row[0].split(delimiter).map(cell => cell.replace(/^["']|["']$/g, '').trim());
                                }
                                return row;
                            });
                        }
                    }

                    // 25-Row Header Scanner
                    let headerRowIndex = -1;
                    let mapping = null;
                    const maxScan = Math.min(25, rawData.length);

                    for (let r = 0; r < maxScan; r++) {
                        const rowCandidate = rawData[r];
                        if (!rowCandidate || rowCandidate.length < 2) continue;
                        const headerStrings = rowCandidate.map(col => String(col || '').trim());
                        const testMapping = this.inferColumnMapping(headerStrings);
                        if (testMapping.isValid) {
                            headerRowIndex = r;
                            mapping = testMapping;
                            break;
                        }
                    }

                    if (headerRowIndex === -1 || !mapping) return;
                    if (!metadata.schemaMapping) metadata.schemaMapping = mapping.indices;

                    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0) continue;

                        const period = String(row[mapping.indices.period] || '').trim();
                        if (!period || period.toUpperCase() === 'N/A' || period.startsWith('Total')) continue;

                        let reporterISO = mapping.indices.reporterISO !== undefined ? String(row[mapping.indices.reporterISO] || '').trim().toUpperCase() : '';
                        let reporterDesc = mapping.indices.reporterDesc !== undefined ? String(row[mapping.indices.reporterDesc] || '').trim() : '';
                        if (!reporterISO && !reporterDesc) reporterISO = 'WLD';
                        if (!reporterDesc) reporterDesc = reporterISO;
                        if (!reporterISO) reporterISO = reporterDesc.slice(0, 3).toUpperCase();

                        let partnerISO = mapping.indices.partnerISO !== undefined ? String(row[mapping.indices.partnerISO] || '').trim().toUpperCase() : '';
                        let partnerDesc = mapping.indices.partnerDesc !== undefined ? String(row[mapping.indices.partnerDesc] || '').trim() : '';
                        if (!partnerISO && !partnerDesc) partnerISO = 'WLD';
                        if (!partnerDesc) partnerDesc = partnerISO;
                        if (!partnerISO) partnerISO = partnerDesc.slice(0, 3).toUpperCase();
                        
                        let cmdCode = mapping.indices.cmdCode !== undefined ? String(row[mapping.indices.cmdCode] || 'TOTAL').trim() : 'TOTAL';
                        if (cmdCode.endsWith('.0')) cmdCode = cmdCode.slice(0, -2);
                        let cmdDesc = mapping.indices.cmdDesc !== undefined ? String(row[mapping.indices.cmdDesc] || `HS ${cmdCode}`).trim() : `HS ${cmdCode}`;
                        
                        let flowCode = mapping.indices.flowCode !== undefined ? String(row[mapping.indices.flowCode] || '').trim().toUpperCase() : 'X';
                        if (flowCode === '1' || flowCode.includes('EXP') || flowCode.includes('SAIDA') || flowCode === 'X') flowCode = 'X';
                        else if (flowCode === '2' || flowCode.includes('IMP') || flowCode.includes('ENTRADA') || flowCode === 'M') flowCode = 'M';
                        else if (flowCode.includes('X')) flowCode = 'X';
                        else if (flowCode.includes('M')) flowCode = 'M';
                        else flowCode = 'X';

                        const netWgt = mapping.indices.netWgt !== undefined ? this.parseNumber(row[mapping.indices.netWgt]) : 0;
                        const tradeValue = mapping.indices.tradeValue !== undefined ? this.parseNumber(row[mapping.indices.tradeValue]) : 0;

                        if (tradeValue > 0 || netWgt > 0) {
                            allRecords.push({
                                period, reporterISO, reporterDesc, partnerISO, partnerDesc,
                                flowCode, cmdCode, cmdDesc, netWgt, tradeValue, sourceFile: fileName
                            });

                            metadata.years.add(period);
                            metadata.reporters.set(reporterISO, reporterDesc);
                            metadata.partners.set(partnerISO, partnerDesc);
                            metadata.commodities.set(cmdCode, cmdDesc);
                            metadata.flows.add(flowCode);
                        }
                    }
                });

                if (allRecords.length === 0) {
                    throw new Error(`No quantifiable trade flows extracted from "${fileName}". Verify Trade Value or Netweight columns.`);
                }

                const serializedMetadata = {
                    years: Array.from(metadata.years).sort(),
                    reporters: Array.from(metadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                    partners: Array.from(metadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                    commodities: Array.from(metadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                    flows: Array.from(metadata.flows),
                    schemaMapping: metadata.schemaMapping
                };

                resolve({ records: allRecords, metadata: serializedMetadata });

            } catch (error) {
                reject(new Error(`Processing failure on "${fileName}": ${error.message}`));
            }
        });
    }

    inferColumnMapping(headers) {
        const indices = {};
        headers.forEach((header, idx) => {
            if (!header) return;
            const clean = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!clean) return;

            for (const [field, keywords] of Object.entries(this.keywordDictionaries)) {
                if (indices[field] !== undefined) continue;
                if (keywords.includes(clean)) { indices[field] = idx; break; }
                for (const kw of keywords) {
                    if (clean.length >= 3 && (clean.includes(kw) || kw.includes(clean))) { indices[field] = idx; break; }
                }
            }
        });

        headers.forEach((header, idx) => {
            const clean = String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (indices.tradeValue === undefined && (clean.includes('val') && (clean.includes('usd') || clean.includes('us') || clean.includes('trade')))) indices.tradeValue = idx;
            if (indices.netWgt === undefined && (clean.includes('wgt') || clean.includes('weight') || clean.includes('qty') || clean.includes('peso') || clean.includes('mass'))) indices.netWgt = idx;
        });

        return {
            isValid: indices.period !== undefined && (indices.reporterISO !== undefined || indices.reporterDesc !== undefined || indices.partnerISO !== undefined || indices.partnerDesc !== undefined) && (indices.tradeValue !== undefined || indices.netWgt !== undefined),
            indices
        };
    }

    parseNumber(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        let str = String(val).trim();
        if (str === '-' || str === 'N/A' || str === 'null') return 0;
        str = str.replace(/[$€R£\s]/g, '').replace(/US/gi, '').replace(/KG/gi, '');
        if (str.includes(',') && str.indexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }
}
