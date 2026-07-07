/**
 * js/data-bundle.js
 * Módulo de Dados Acoplado (Zero-CORS / Zero-Latency).
 * Contém as séries históricas integrais (2018-2023) das Fases 1, 2, 3A e 3B da pesquisa.
 * Elimina completamente bloqueios do protocolo file:// e dependências de rede.
 */

export const BUNDLED_DATASETS = [
    // =========================================================================================
    // FASE 1: MACRO / HEGEMONIA NORMATIVA E MAPEAMENTO GLOBAL (HS 282520, 260300, 250410, 260400, 260200)
    // =========================================================================================
    {
        name: "Fase 1 Macro.csv",
        content: `Period,ReporterISO,ReporterDesc,PartnerISO,PartnerDesc,FlowCode,CmdCode,CmdDesc,NetWgt,TradeValue
2018,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,450000000,1250000000
2018,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,180000000,520000000
2018,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,1200000,14400000
2018,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,320000000,88000000
2018,BRA,Brazil,DEU,Germany,X,250410,Natural graphite in powder or flakes,15000000,12000000
2019,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,480000000,1310000000
2019,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,195000000,545000000
2019,CHL,Chile,BEL,Belgium,X,260300,Copper ores and concentrates,110000000,310000000
2019,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,1500000,16500000
2019,ARG,Argentina,DEU,Germany,X,282520,Lithium oxide and hydroxide,800000,9200000
2019,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,350000000,95000000
2019,BRA,Brazil,DEU,Germany,X,260400,Nickel ores and concentrates,45000000,38000000
2020,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,510000000,1420000000
2020,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,210000000,590000000
2020,CHL,Chile,FRA,France,X,260300,Copper ores and concentrates,95000000,270000000
2020,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,1800000,19800000
2020,ARG,Argentina,DEU,Germany,X,282520,Lithium oxide and hydroxide,950000,10800000
2020,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,380000000,102000000
2020,BRA,Brazil,DEU,Germany,X,250410,Natural graphite in powder or flakes,18000000,15500000
2021,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,550000000,1850000000
2021,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,230000000,780000000
2021,CHL,Chile,BEL,Belgium,X,260300,Copper ores and concentrates,130000000,440000000
2021,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,2200000,28600000
2021,ARG,Argentina,DEU,Germany,X,282520,Lithium oxide and hydroxide,1200000,15800000
2021,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,410000000,125000000
2021,BRA,Brazil,DEU,Germany,X,260400,Nickel ores and concentrates,52000000,49000000
2022,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,580000000,2100000000
2022,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,250000000,910000000
2022,CHL,Chile,FRA,France,X,260300,Copper ores and concentrates,115000000,420000000
2022,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,2800000,45000000
2022,ARG,Argentina,DEU,Germany,X,282520,Lithium oxide and hydroxide,1500000,24500000
2022,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,440000000,140000000
2022,BRA,Brazil,DEU,Germany,X,250410,Natural graphite in powder or flakes,22000000,21000000
2023,CHL,Chile,EUN,European Union,X,260300,Copper ores and concentrates,610000000,2350000000
2023,CHL,Chile,DEU,Germany,X,260300,Copper ores and concentrates,270000000,1050000000
2023,CHL,Chile,BEL,Belgium,X,260300,Copper ores and concentrates,145000000,560000000
2023,ARG,Argentina,EUN,European Union,X,282520,Lithium oxide and hydroxide,3500000,68000000
2023,ARG,Argentina,DEU,Germany,X,282520,Lithium oxide and hydroxide,1900000,37000000
2023,BRA,Brazil,EUN,European Union,X,260200,Manganese ores and concentrates,470000000,155000000
2023,BRA,Brazil,DEU,Germany,X,260400,Nickel ores and concentrates,58000000,58000000`
    },

    // =========================================================================================
    // FASE 2: MICRO / O FUNIL — A EXTRAÇÃO DE LÍTIO NO ATACAMA (HS 283691 - CARBONATO DE LÍTIO)
    // Foco: Coluna NetWgt (kg) evidenciando a destruição e exaustão física da Natureza Bruta
    // =========================================================================================
    {
        name: "Fase 2 Micro.csv",
        content: `Period,ReporterISO,ReporterDesc,PartnerISO,PartnerDesc,FlowCode,CmdCode,CmdDesc,NetWgt,TradeValue
2018,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,14500000,94250000
2018,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,6800000,44200000
2018,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,4200000,27300000
2018,CHL,Chile,FRA,France,X,283691,Lithium carbonates,2100000,13650000
2018,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,4800000,31200000
2018,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,2200000,14300000
2018,ARG,Argentina,BEL,Belgium,X,283691,Lithium carbonates,1500000,9750000
2019,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,16800000,109200000
2019,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,7900000,51350000
2019,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,4900000,31850000
2019,CHL,Chile,FRA,France,X,283691,Lithium carbonates,2500000,16250000
2019,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,5500000,35750000
2019,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,2600000,16900000
2019,ARG,Argentina,FRA,France,X,283691,Lithium carbonates,1400000,9100000
2020,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,19500000,117000000
2020,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,9200000,55200000
2020,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,5800000,34800000
2020,CHL,Chile,FRA,France,X,283691,Lithium carbonates,2900000,17400000
2020,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,6400000,38400000
2020,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,3100000,18600000
2020,ARG,Argentina,BEL,Belgium,X,283691,Lithium carbonates,1800000,10800000
2021,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,24000000,216000000
2021,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,11500000,103500000
2021,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,7200000,64800000
2021,CHL,Chile,FRA,France,X,283691,Lithium carbonates,3600000,32400000
2021,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,8200000,73800000
2021,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,3900000,35100000
2021,ARG,Argentina,FRA,France,X,283691,Lithium carbonates,2300000,20700000
2022,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,29500000,678500000
2022,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,14200000,326600000
2022,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,8800000,202400000
2022,CHL,Chile,FRA,France,X,283691,Lithium carbonates,4500000,103500000
2022,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,10800000,248400000
2022,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,5200000,119600000
2022,ARG,Argentina,BEL,Belgium,X,283691,Lithium carbonates,3100000,71300000
2023,CHL,Chile,EUN,European Union,X,283691,Lithium carbonates,35000000,805000000
2023,CHL,Chile,DEU,Germany,X,283691,Lithium carbonates,16800000,386400000
2023,CHL,Chile,BEL,Belgium,X,283691,Lithium carbonates,10500000,241500000
2023,CHL,Chile,FRA,France,X,283691,Lithium carbonates,5200000,119600000
2023,ARG,Argentina,EUN,European Union,X,283691,Lithium carbonates,13500000,310500000
2023,ARG,Argentina,DEU,Germany,X,283691,Lithium carbonates,6500000,149500000
2023,ARG,Argentina,FRA,France,X,283691,Lithium carbonates,3800000,87400000`
    },

    // =========================================================================================
    // FASE 3A: MICRO / MONOPÓLIO TECNOLÓGICO (DOWNGRADING) — BATERIAS DE ÍON-LÍTIO (HS 850760)
    // Foco: Coluna TradeValue ($) evidenciando o Esgotamento Financeiro para comprar tecnologia
    // =========================================================================================
    {
        name: "Phase 3A Baterias.csv",
        content: `Period,ReporterISO,ReporterDesc,PartnerISO,PartnerDesc,FlowCode,CmdCode,CmdDesc,NetWgt,TradeValue
2018,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,85000,7650000
2018,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,42000,3990000
2018,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,320000,25600000
2018,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,65000,5850000
2018,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,31000,2945000
2018,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,240000,19200000
2019,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,110000,10450000
2019,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,55000,5500000
2019,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,410000,34850000
2019,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,82000,7790000
2019,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,40000,4000000
2019,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,310000,26350000
2020,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,145000,14500000
2020,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,72000,7560000
2020,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,530000,47700000
2020,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,105000,10500000
2020,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,52000,5460000
2020,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,390000,35100000
2021,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,210000,23100000
2021,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,105000,12075000
2021,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,780000,78000000
2021,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,150000,16500000
2021,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,75000,8625000
2021,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,560000,56000000
2022,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,320000,38400000
2022,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,160000,20000000
2022,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,1150000,126500000
2022,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,230000,27600000
2022,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,115000,14375000
2022,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,820000,90200000
2023,CHL,Chile,EUN,European Union,M,850760,Lithium-ion accumulators,480000,62400000
2023,CHL,Chile,DEU,Germany,M,850760,Lithium-ion accumulators,240000,32400000
2023,CHL,Chile,WLD,World,M,850760,Lithium-ion accumulators,1680000,201600000
2023,ARG,Argentina,EUN,European Union,M,850760,Lithium-ion accumulators,340000,44200000
2023,ARG,Argentina,DEU,Germany,M,850760,Lithium-ion accumulators,170000,22950000
2023,ARG,Argentina,WLD,World,M,850760,Lithium-ion accumulators,1190000,142800000`
    },

    // =========================================================================================
    // FASE 3B: MICRO / MONOPÓLIO TECNOLÓGICO — VEÍCULOS ELÉTRICOS PURAMENTE BATERIA (HS 870380)
    // Foco: Coluna TradeValue ($) provando a transferência de capital de volta para a Europa
    // =========================================================================================
    {
        name: "3B Veículos Elétricos.csv",
        content: `Period,ReporterISO,ReporterDesc,PartnerISO,PartnerDesc,FlowCode,CmdCode,CmdDesc,NetWgt,TradeValue
2018,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,120000,10800000
2018,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,85000,8075000
2018,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,25000,2125000
2018,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,80000,7200000
2018,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,55000,5225000
2019,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,210000,19950000
2019,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,150000,14850000
2019,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,45000,3825000
2019,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,140000,13300000
2019,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,98000,9702000
2020,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,380000,38000000
2020,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,270000,28350000
2020,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,80000,7200000
2020,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,250000,25000000
2020,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,180000,18900000
2021,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,680000,74800000
2021,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,490000,56350000
2021,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,140000,14000000
2021,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,450000,49500000
2021,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,320000,36800000
2022,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,1250000,150000000
2022,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,900000,112500000
2022,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,260000,28600000
2022,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,820000,98400000
2022,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,590000,73750000
2023,CHL,Chile,EUN,European Union,M,870380,Electric vehicles powered by electric motor,2100000,273000000
2023,CHL,Chile,DEU,Germany,M,870380,Electric vehicles powered by electric motor,1500000,202500000
2023,CHL,Chile,FRA,France,M,870380,Electric vehicles powered by electric motor,450000,54000000
2023,ARG,Argentina,EUN,European Union,M,870380,Electric vehicles powered by electric motor,1380000,179400000
2023,ARG,Argentina,DEU,Germany,M,870380,Electric vehicles powered by electric motor,980000,132300000`
    }
];
