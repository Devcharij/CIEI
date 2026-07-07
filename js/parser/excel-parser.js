export class ExcelParser {
    async parseFile(file, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = await this.parseBuffer(e.target.result, file.name, onProgress);
                    resolve(result);
                } catch (error) { reject(error); }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async parseBuffer(buffer, fileName = "Dataset", onProgress = () => {}) {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const allRecords = [];
        const metadata = { years: new Set(), reporters: new Map(), partners: new Map(), commodities: new Map(), flows: new Set() };

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (jsonData.length === 0) return;

            jsonData.forEach(row => {
                // Mapeamento dinâmico (tenta achar qualquer coluna parecida com o nome correto)
                const getVal = (keys) => {
                    for (const k of keys) {
                        for (const rKey of Object.keys(row)) {
                            if (rKey.toLowerCase().includes(k)) return row[rKey];
                        }
                    }
                    return null;
                };

                const record = {
                    period: getVal(['year', 'period', 'refyear', 'ano']) || "2023",
                    reporterISO: getVal(['reporteriso', 'reporter']),
                    reporterDesc: getVal(['reporterdesc', 'reporter']),
                    partnerISO: getVal(['partneriso', 'partner']),
                    partnerDesc: getVal(['partnerdesc', 'partner']),
                    flowCode: String(getVal(['flow', 'fluxo']) || 'X').toUpperCase().startsWith('I') ? 'M' : 'X',
                    cmdCode: getVal(['cmdcode', 'hs', 'commodity']),
                    cmdDesc: getVal(['cmddesc', 'commoditydesc', 'desc']),
                    netWgt: parseFloat(getVal(['netwgt', 'weight', 'peso'])) || 0,
                    tradeValue: parseFloat(getVal(['tradevalue', 'value', 'valor', 'primaryvalue'])) || 0,
                    sourceFile: fileName
                };

                if (record.netWgt > 0 || record.tradeValue > 0) {
                    allRecords.push(record);
                    metadata.years.add(record.period);
                    metadata.reporters.set(record.reporterISO, record.reporterDesc);
                    metadata.partners.set(record.partnerISO, record.partnerDesc);
                    metadata.commodities.set(record.cmdCode, record.cmdDesc);
                    metadata.flows.add(record.flowCode);
                }
            });
        });

        return { 
            records: allRecords, 
            metadata: {
                years: Array.from(metadata.years).sort(),
                reporters: Array.from(metadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                partners: Array.from(metadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                commodities: Array.from(metadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                flows: Array.from(metadata.flows)
            }
        };
    }
}
