/**
 * excel-parser.js
 * Motor de inferência dinâmica compatível com qualquer planilha exportada pelo UN Comtrade.
 * Não utiliza colunas fixas; inspeciona cabeçalhos via expressões regulares.
 */
export class ExcelParser {
    constructor() {
        // Dicionário de Sinônimos e Padrões Regex para Cabeçalhos Comtrade
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
     * Processa um arquivo File e converte em registros normalizados.
     * @param {File} file - Arquivo carregado pelo usuário.
     * @param {Function} onProgress - Callback para notificar progresso na UI.
     */
    async parseFile(file, onProgress = () => {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    onProgress('Analisando estrutura binária do arquivo...');
                    const data = new Uint8Array(e.target.result);
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

                    // Varre todas as abas presentes na planilha sem assumir nomes de sheets
                    workbook.SheetNames.forEach((sheetName, index) => {
                        onProgress(`Processando Aba ${index + 1}/${workbook.SheetNames.length}: "${sheetName}"...`);
                        const worksheet = workbook.Sheets[sheetName];
                        
                        // Converte para JSON com cabeçalhos não processados (header: 1 retorna arrays brutos)
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                        if (rawData.length < 2) return; // Aba vazia ou sem dados adequados

                        // Passo 1: Inferir mapeamento de colunas na linha de cabeçalho
                        const headerRow = rawData[0].map(col => String(col || '').trim());
                        const mapping = this.inferColumnMapping(headerRow);
                        
                        if (!mapping.isValid) {
                            console.warn(`Aba "${sheetName}" ignorada por não possuir cabeçalhos compatíveis com o padrão UN Comtrade.`);
                            return;
                        }

                        if (!metadata.schemaMapping) metadata.schemaMapping = mapping.indices;

                        // Passo 2: Extração e Normalização de Dados Linha a Linha
                        for (let i = 1; i < rawData.length; i++) {
                            const row = rawData[i];
                            if (!row || row.length === 0) continue;

                            // Tratamento de valores com fallbacks numéricos para cálculo de EUE
                            const period = String(row[mapping.indices.period] || 'N/A').trim();
                            const reporterISO = String(row[mapping.indices.reporterISO] || 'SYS').trim().toUpperCase();
                            const reporterDesc = String(row[mapping.indices.reporterDesc] || reporterISO).trim();
                            const partnerISO = String(row[mapping.indices.partnerISO] || 'WLD').trim().toUpperCase();
                            const partnerDesc = String(row[mapping.indices.partnerDesc] || partnerISO).trim();
                            
                            // Normalização do Código HS (garante formatação string sem perda de zeros à esquerda)
                            let cmdCode = String(row[mapping.indices.cmdCode] || 'TOTAL').trim();
                            if (cmdCode.endsWith('.0')) cmdCode = cmdCode.slice(0, -2); // Limpa resíduos de float do Excel
                            
                            const cmdDesc = String(row[mapping.indices.cmdDesc] || `HS ${cmdCode}`).trim();
                            
                            // Normalização dos fluxos comerciais (1/X = Export, 2/M = Import)
                            let flowCode = String(row[mapping.indices.flowCode] || '').trim().toUpperCase();
                            if (flowCode === '1' || flowCode.includes('EXP')) flowCode = 'X';
                            if (flowCode === '2' || flowCode.includes('IMP')) flowCode = 'M';

                            const netWgt = parseFloat(row[mapping.indices.netWgt]) || 0;
                            const tradeValue = parseFloat(row[mapping.indices.tradeValue]) || 0;

                            // Só indexa se possuir peso ou valor monetário válido
                            if (tradeValue > 0 || netWgt > 0) {
                                const record = {
                                    period,
                                    reporterISO,
                                    reporterDesc,
                                    partnerISO,
                                    partnerDesc,
                                    flowCode,
                                    cmdCode,
                                    cmdDesc,
                                    netWgt,
                                    tradeValue
                                };

                                allRecords.push(record);

                                // Alimentação contínua dos dicionários de metadados
                                metadata.years.add(period);
                                metadata.reporters.set(reporterISO, reporterDesc);
                                metadata.partners.set(partnerISO, partnerDesc);
                                metadata.commodities.set(cmdCode, cmdDesc);
                                metadata.flows.add(flowCode);
                            }
                        }
                    });

                    if (allRecords.length === 0) {
                        reject(new Error('Nenhum registro comercial válido com volume (kg) ou valor (US$) foi encontrado no arquivo importado.'));
                        return;
                    }

                    // Prepara metadados para persistência em IndexedDB
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
                    reject(new Error(`Falha ao processar planilha: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Erro de I/O na leitura do arquivo local.'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Mapeia os índices das colunas a partir do cabeçalho detectado.
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

        // Verificação de viabilidade mínima: precisa de Ano, Reporter, Partner e pelo menos Valor OU Peso
        const hasTimeAndEntities = indices.period !== undefined && indices.reporterISO !== undefined && indices.partnerISO !== undefined;
        const hasMetrics = indices.tradeValue !== undefined || indices.netWgt !== undefined;

        return {
            isValid: hasTimeAndEntities && hasMetrics,
            indices
        };
    }
}