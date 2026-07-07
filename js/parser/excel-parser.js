/**
 * excel-parser.js
 * Motor de inferência dinâmica compatível com planilhas Excel (.xlsx) e arquivos .csv do UN Comtrade.
 * Inspeciona cabeçalhos via heurística e expressões regulares, eliminando hardcoding de colunas.
 */
export class ExcelParser {
    constructor() {
        // Dicionário de Sinônimos e Padrões Regex para Cabeçalhos Comtrade (Históricos e Recentes)
        this.schemaPatterns = {
            period: /^(period|year|refyear|yr|ano)$/i,
            reporterISO: /^(reporteriso|reporter_iso|reportercode|rt3iso|reporter)$/i,
            reporterDesc: /^(reporterdesc|reporter_desc|reportername|reporter_name|pais_reportador)$/i,
            partnerISO: /^(partneriso|partner_iso|partnercode|pt3iso|partner)$/i,
            partnerDesc: /^(partnerdesc|partner_desc|partnername|partner_name|pais_parceiro)$/i,
            flowCode: /^(flowcode|flow_code|flow|tradeflow|fluxo_code)$/i,
            flowDesc: /^(flowdesc|flow_desc|trade_flow|fluxo)$/i,
            cmdCode: /^(cmdcode|commoditycode|hscode|hs_code|cmd|codigo_hs)$/i,
            cmdDesc: /^(cmddesc|commoditydesc|hsdesc|commodity|desc_mercadoria)$/i,
            netWgt: /^(netwgt|netweight|weight|peso_liquido|net_wgt_kg|qty)$/i,
            tradeValue: /^(tradevalue|primaryvalue|value|valor|trade_value_usd|fobvalue|cifvalue)$/i
        };
    }

    /**
     * Processa um arquivo local (File) enviado manualmente pelo usuário via input HTML.
     * @param {File} file - Arquivo carregado na interface.
     * @param {Function} onProgress - Callback para notificação de progresso na UI.
     */
    async parseFile(file, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const result = await this.parseBuffer(e.target.result, file.name, onProgress);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erro de I/O na leitura do arquivo local.'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Processa dados a partir de um ArrayBuffer (usado no carregamento automático via fetch da pasta /data).
     * @param {ArrayBuffer} buffer - Fluxo binário do arquivo Excel ou CSV.
     * @param {String} fileName - Nome do arquivo para rastreamento no painel de auditoria.
     * @param {Function} onProgress - Callback de progresso.
     */
    async parseBuffer(buffer, fileName = "Dataset Comtrade", onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            try {
                onProgress(`Analisando estrutura binária do dataset: "${fileName}"...`);
                const data = new Uint8Array(buffer);
                
                // O SheetJS (XLSX) interpreta nativamente buffers de arquivos .xlsx, .xls e .csv
                const workbook = XLSX.read(data, { type: 'array' });

                const allRecords = [];
                const metadata = {
                    years: new Set(),
                    reporters: new Map(),
                    partners: new Map(),
                    commodities: new Map(),
                    flows: new Set(),
                    schemaMapping: null
                };

                // Varre todas as abas (em arquivos CSV, haverá apenas uma aba gerada automaticamente)
                workbook.SheetNames.forEach((sheetName, index) => {
                    onProgress(`Processando Aba ${index + 1}/${workbook.SheetNames.length}: "${sheetName}" (${fileName})...`);
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Converte a grade em matriz bidimensional de valores brutos
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                    if (rawData.length < 2) return; // Ignora abas sem dados transacionais

                    // Passo 1: Inferência da Linha de Cabeçalho (Header Row Parsing)
                    const headerRow = rawData[0].map(col => String(col || '').trim());
                    const mapping = this.inferColumnMapping(headerRow);
                    
                    if (!mapping.isValid) {
                        console.warn(`[Aviso] Arquivo "${fileName}" (Aba "${sheetName}") ignorado por não possuir cabeçalhos compatíveis com o padrão UN Comtrade.`);
                        return;
                    }

                    if (!metadata.schemaMapping) metadata.schemaMapping = mapping.indices;

                    // Passo 2: Normalização e Limpeza Linha a Linha
                    for (let i = 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0) continue;

                        const period = String(row[mapping.indices.period] || 'N/A').trim();
                        const reporterISO = String(row[mapping.indices.reporterISO] || 'SYS').trim().toUpperCase();
                        const reporterDesc = String(row[mapping.indices.reporterDesc] || reporterISO).trim();
                        const partnerISO = String(row[mapping.indices.partnerISO] || 'WLD').trim().toUpperCase();
                        const partnerDesc = String(row[mapping.indices.partnerDesc] || partnerISO).trim();
                        
                        // Normalização rigorosa do Código HS (elimina ".0" advindo de conversões float do Excel)
                        let cmdCode = String(row[mapping.indices.cmdCode] || 'TOTAL').trim();
                        if (cmdCode.endsWith('.0')) cmdCode = cmdCode.slice(0, -2);
                        const cmdDesc = String(row[mapping.indices.cmdDesc] || `HS ${cmdCode}`).trim();
                        
                        // Harmonização de fluxos comerciais (Converte nomenclaturas numéricas 1/2 para X/M)
                        let flowCode = String(row[mapping.indices.flowCode] || '').trim().toUpperCase();
                        if (flowCode === '1' || flowCode.includes('EXP')) flowCode = 'X';
                        if (flowCode === '2' || flowCode.includes('IMP')) flowCode = 'M';

                        const netWgt = parseFloat(row[mapping.indices.netWgt]) || 0;
                        const tradeValue = parseFloat(row[mapping.indices.tradeValue]) || 0;

                        // Indexa exclusivamente registros com significância física ou monetária
                        if (tradeValue > 0 || netWgt > 0) {
                            allRecords.push({
                                period,
                                reporterISO,
                                reporterDesc,
                                partnerISO,
                                partnerDesc,
                                flowCode,
                                cmdCode,
                                cmdDesc,
                                netWgt,
                                tradeValue,
                                sourceFile: fileName // Rastreabilidade analítica do arquivo de origem
                            });

                            // Alimentação dos conjuntos de metadados para geração dos seletores reativos
                            metadata.years.add(period);
                            metadata.reporters.set(reporterISO, reporterDesc);
                            metadata.partners.set(partnerISO, partnerDesc);
                            metadata.commodities.set(cmdCode, cmdDesc);
                            metadata.flows.add(flowCode);
                        }
                    }
                });

                if (allRecords.length === 0) {
                    throw new Error(`Nenhum registro comercial válido com volume (kg) ou valor (US$) foi encontrado em "${fileName}".`);
                }

                // Serialização dos metadados para envio ao IndexedDB ou fusão de múltiplos arquivos
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
                reject(new Error(`Falha no processamento de "${fileName}": ${error.message}`));
            }
        });
    }

    /**
     * Mapeia os índices das colunas a partir do cabeçalho detectado usando heurística de assinaturas.
     */
    inferColumnMapping(headers) {
        const indices = {};
        let matchesCount = 0;

        headers.forEach((header, idx) => {
            for (const [field, regex] of Object.entries(this.schemaPatterns)) {
                if (regex.test(header) && indices[field] === undefined) {
                    indices[field] = idx;
                    matchesCount++;
                    break;
                }
            }
        });

        // Validação mínima de viabilidade estrutural do UN Comtrade
        const hasTimeAndEntities = indices.period !== undefined && indices.reporterISO !== undefined && indices.partnerISO !== undefined;
        const hasMetrics = indices.tradeValue !== undefined || indices.netWgt !== undefined;

        return {
            isValid: hasTimeAndEntities && hasMetrics,
            indices
        };
    }
}