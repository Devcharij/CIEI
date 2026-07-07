# UN Comtrade Analytics Platform — Geopolitical Metabolism & EUE
**Plataforma de Visualização Científica para Análise de Cadeias Globais de Valor e Troca Ecologicamente Desigual (Ecologically Unequal Exchange - EUE).**

Esta aplicação foi desenvolvida de forma 100% modular, *client-side*, como plataforma complementar de pesquisa acadêmica em Economia Política Internacional. O sistema inspeciona e inferir dinamicamente a estrutura de qualquer exportação de dados do **UN Comtrade** (.xlsx ou .csv), eliminando a codificação rígida (*hardcoding*) de códigos HS, países, anos ou colunas.

---

## 🔬 Arcabouço Analítico e Científico

A plataforma foi arquitetada para demonstrar empírica e visualmente o paradoxo de assimetria nas Cadeias Globais de Valor da transição verde (European Green Deal):

1. **Fase de Espoliação (O "Funil" Extrativo - HS 283691, 260300):** Isolamento da métrica de massa bruta (`Netweight` em quilogramas) nas exportações da periferia (ex: Triângulo do Lítio — Chile e Argentina) em direção ao centro industrial (UE-27). Revela a perda líquida e insustentável de natureza bruta no local de extração.
2. **Fase de Financeirização (Monopólio Tecnológico - HS 850760, 870380):** Foco no fluxo financeiro (`Trade Value` em dólares norte-americanos) das importações de bens de alto valor agregado (Baterias de Íon-Lítio e Veículos Elétricos). Demonstra o esgotamento monetário e o pagamento exponencial pela tecnologia fabricada com o mineral de origem.
3. **Markup Geopolítico:** Categorização automática das entidades transacionadoras em seus papéis ontológicos na divisão internacional do trabalho (*Centro Hegemônico Tecnológico* vs. *Periferia Extrativa de Processamento Primário*).

---

## 🏗️ Arquitetura de Software e Tecnologias

O projeto opera de forma autônoma sem requerer bancos de dados em servidores SQL/NoSQL ou contêineres Docker, sendo compatível com hospedagem estática:

* **IndexedDB (`idb-manager.js`):** Armazenamento transacional no cliente (Client-side NoSQL) com índices compostos para realizar consultas filtradas complexas em datasets de mais de 100.000 linhas em milissegundos sem congelar a thread principal.
* **SheetJS / Excel Inference Engine (`excel-parser.js`):** Motor heurístico de parsing baseando-se em expressões regulares (*regex matching*) de sinônimos de colunas oficiais da API Comtrade.
* **Google Charts (Sankey Diagram API):** Motor de visualização primário de fluxos bilaterais orientados a grafo, comutável em tempo real entre peso físico e valor monetário.
* **Chart.js (`aux-charts.js`):** Gráficos de séries temporais de assimetria cruzada (Efeito Tesoura) e índices de Downgrading por unidade de massa ($US$/kg$).
* **CSS Custom Properties (Light / Dark Mode):** Conformidade rigorosa com normas de contraste WCAG 2.1 AA para visualização em conferências e publicações.

---

## 🚀 Instruções de Instalação e Deploy no GitHub Pages

Como a aplicação é integralmente baseada em tecnologias padronizadas da Web (HTML5, ES6 Modules e CSS3), o processo de publicação é contínuo e isento de etapas de *build* ou compilação complexa:

1. **Clonar o Repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/comtrade-analytics-platform.git](https://github.com/seu-usuario/comtrade-analytics-platform.git)
   cd comtrade-analytics-platform