import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
// Importações específicas para d3-sankey e d3-chord
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { chord, ribbon } from 'd3-chord';


// Componente principal da aplicação
const App = () => {
    // Estado para armazenar os dados do CSV
    const [csvData, setCsvData] = useState([]);
    // Estado para armazenar os tipos de dashboard selecionados (agora um array)
    const [selectedDashboardType, setSelectedDashboardType] = useState([]);
    // Estado para armazenar as configurações de campo para cada gráfico selecionado
    const [chartConfigs, setChartConfigs] = useState({});
    // Estado para mensagens de erro
    const [errorMessage, setErrorMessage] = useState('');

    // Refs para os elementos SVG dos gráficos
    const barChartRef = useRef(null);
    const treemapRef = useRef(null);
    const stackedBarChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const pieChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const areaChartRef = useRef(null);
    const scatterPlotRef = useRef(null);
    const bubbleChartRef = useRef(null);
    const heatmapRef = useRef(null);
    const radialBarChartRef = useRef(null);
    const gaugeChartRef = useRef(null);
    const stackedAreaChartRef = useRef(null);
    const streamgraphRef = useRef(null);
    // Novos refs para os 9 gráficos adicionais
    const boxPlotRef = useRef(null);
    const violinPlotRef = useRef(null);
    const parallelCoordinatesRef = useRef(null);
    const chordDiagramRef = useRef(null);
    const sankeyDiagramRef = useRef(null);
    const packedCirclesRef = useRef(null);
    const calendarHeatmapRef = useRef(null);
    const dendrogramRef = useRef(null);
    const forceDirectedGraphRef = useRef(null);


    // Função para lidar com o upload do arquivo CSV
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setErrorMessage('Nenhum arquivo selecionado.');
            return;
        }

        // Verifica se o arquivo é um CSV
        if (file.type !== 'text/csv') {
            setErrorMessage('Por favor, selecione um arquivo CSV válido.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                // Divide o texto em linhas e remove linhas vazias
                const lines = text.split('\n').filter(line => line.trim() !== '');

                if (lines.length === 0) {
                    setErrorMessage('O arquivo CSV está vazio.');
                    setCsvData([]);
                    return;
                }

                // Pega o cabeçalho
                const headers = lines[0].split(',').map(header => header.trim());

                // Mapeia as linhas restantes para objetos
                const parsedData = lines.slice(1).map(line => {
                    const values = line.split(',').map(value => value.trim());
                    const row = {};
                    headers.forEach((header, index) => {
                        // Tenta converter para número se possível
                        row[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index]);
                    });
                    return row;
                });

                setCsvData(parsedData);
                setErrorMessage(''); // Limpa qualquer erro anterior
                setSelectedDashboardType([]); // Reseta a seleção do dashboard ao carregar novos dados
                setChartConfigs({}); // Reseta as configurações dos gráficos
            } catch (error) {
                setErrorMessage('Erro ao processar o arquivo CSV. Verifique o formato.');
                console.error('Erro ao ler CSV:', error);
                setCsvData([]);
            }
        };

        reader.onerror = () => {
            setErrorMessage('Erro ao ler o arquivo.');
            setCsvData([]);
        };

        reader.readAsText(file);
    };

    // Função para selecionar/desselecionar o tipo de dashboard
    const handleDashboardSelect = (type) => {
        setSelectedDashboardType(prevSelected => {
            const newSelected = prevSelected.includes(type)
                ? prevSelected.filter(item => item !== type) // Remove se já estiver selecionado
                : [...prevSelected, type]; // Adiciona se não estiver selecionado

            // Atualiza as configurações do gráfico com base na seleção
            setChartConfigs(prevConfigs => {
                const newConfigs = { ...prevConfigs };
                if (newSelected.includes(type) && !prevConfigs[type] && csvData.length > 0) {
                    // Define configurações padrão se o gráfico for selecionado pela primeira vez
                    const headers = Object.keys(csvData[0]);
                    if (['cards', 'bar-chart', 'donut-chart', 'pie-chart', 'line-chart', 'area-chart', 'radial-bar-chart', 'gauge-chart', 'box-plot', 'violin-plot', 'packed-circles'].includes(type)) {
                        newConfigs[type] = { category: headers[0], value: headers[1] || headers[0] };
                    } else if (['scatter-plot', 'bubble-chart'].includes(type)) {
                        newConfigs[type] = { x: headers[0], y: headers[1], size: headers[2] || headers[1] };
                    } else if (['stacked-bar-chart', 'stacked-area-chart', 'streamgraph', 'parallel-coordinates'].includes(type)) {
                        newConfigs[type] = { category: headers[0], series: headers.slice(1) };
                    } else if (type === 'heatmap') {
                        newConfigs[type] = { row: headers[0], col: headers[1], value: headers[2] };
                    } else if (type === 'calendar-heatmap') {
                        newConfigs[type] = { date: headers[0], value: headers[1] };
                    } else if (['chord-diagram', 'sankey-diagram', 'force-directed-graph'].includes(type)) {
                         newConfigs[type] = { source: headers[0], target: headers[1], value: headers[2] || headers[1] };
                    } else if (type === 'dendrogram') {
                         newConfigs[type] = { parent: headers[0], child: headers[1] };
                    }
                } else if (!newSelected.includes(type)) {
                    delete newConfigs[type]; // Remove as configurações se o gráfico for desselecionado
                }
                return newConfigs;
            });
            return newSelected;
        });
    };

    // Função para atualizar a configuração de um campo específico do gráfico
    const handleChartConfigChange = (chartType, field, value) => {
        setChartConfigs(prevConfigs => ({
            ...prevConfigs,
            [chartType]: {
                ...prevConfigs[chartType],
                [field]: value,
            },
        }));
    };

    // Efeitos para renderizar os gráficos quando o tipo está selecionado ou os dados mudam
    useEffect(() => {
        if (selectedDashboardType.includes('bar-chart') && csvData.length > 0 && barChartRef.current && chartConfigs['bar-chart']) {
            drawBarChart(chartConfigs['bar-chart'].category, chartConfigs['bar-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('treemap') && csvData.length > 0 && treemapRef.current && chartConfigs['treemap']) {
            drawTreemap(chartConfigs['treemap'].category, chartConfigs['treemap'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('stacked-bar-chart') && csvData.length > 0 && stackedBarChartRef.current && chartConfigs['stacked-bar-chart']) {
            drawStackedBarChart(chartConfigs['stacked-bar-chart'].category, chartConfigs['stacked-bar-chart'].series);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('donut-chart') && csvData.length > 0 && donutChartRef.current && chartConfigs['donut-chart']) {
            drawDonutChart(chartConfigs['donut-chart'].category, chartConfigs['donut-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('pie-chart') && csvData.length > 0 && pieChartRef.current && chartConfigs['pie-chart']) {
            drawPieChart(chartConfigs['pie-chart'].category, chartConfigs['pie-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('line-chart') && csvData.length > 0 && lineChartRef.current && chartConfigs['line-chart']) {
            drawLineChart(chartConfigs['line-chart'].category, chartConfigs['line-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('area-chart') && csvData.length > 0 && areaChartRef.current && chartConfigs['area-chart']) {
            drawAreaChart(chartConfigs['area-chart'].category, chartConfigs['area-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('scatter-plot') && csvData.length > 0 && scatterPlotRef.current && chartConfigs['scatter-plot']) {
            drawScatterPlot(chartConfigs['scatter-plot'].x, chartConfigs['scatter-plot'].y);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('bubble-chart') && csvData.length > 0 && bubbleChartRef.current && chartConfigs['bubble-chart']) {
            drawBubbleChart(chartConfigs['bubble-chart'].x, chartConfigs['bubble-chart'].y, chartConfigs['bubble-chart'].size);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('heatmap') && csvData.length > 0 && heatmapRef.current && chartConfigs['heatmap']) {
            drawHeatmap(chartConfigs['heatmap'].row, chartConfigs['heatmap'].col, chartConfigs['heatmap'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('radial-bar-chart') && csvData.length > 0 && radialBarChartRef.current && chartConfigs['radial-bar-chart']) {
            drawRadialBarChart(chartConfigs['radial-bar-chart'].category, chartConfigs['radial-bar-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('gauge-chart') && csvData.length > 0 && gaugeChartRef.current && chartConfigs['gauge-chart']) {
            drawGaugeChart(chartConfigs['gauge-chart'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('stacked-area-chart') && csvData.length > 0 && stackedAreaChartRef.current && chartConfigs['stacked-area-chart']) {
            drawStackedAreaChart(chartConfigs['stacked-area-chart'].category, chartConfigs['stacked-area-chart'].series);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('streamgraph') && csvData.length > 0 && streamgraphRef.current && chartConfigs['streamgraph']) {
            drawStreamgraph(chartConfigs['streamgraph'].category, chartConfigs['streamgraph'].series);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    // Novos useEffects para os 9 gráficos adicionais
    useEffect(() => {
        if (selectedDashboardType.includes('box-plot') && csvData.length > 0 && boxPlotRef.current && chartConfigs['box-plot']) {
            drawBoxPlot(chartConfigs['box-plot'].category, chartConfigs['box-plot'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('violin-plot') && csvData.length > 0 && violinPlotRef.current && chartConfigs['violin-plot']) {
            drawViolinPlot(chartConfigs['violin-plot'].category, chartConfigs['violin-plot'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('parallel-coordinates') && csvData.length > 0 && parallelCoordinatesRef.current && chartConfigs['parallel-coordinates']) {
            drawParallelCoordinates(chartConfigs['parallel-coordinates'].series);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('chord-diagram') && csvData.length > 0 && chordDiagramRef.current && chartConfigs['chord-diagram']) {
            drawChordDiagram(chartConfigs['chord-diagram'].source, chartConfigs['chord-diagram'].target, chartConfigs['chord-diagram'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('sankey-diagram') && csvData.length > 0 && sankeyDiagramRef.current && chartConfigs['sankey-diagram']) {
            drawSankeyDiagram(chartConfigs['sankey-diagram'].source, chartConfigs['sankey-diagram'].target, chartConfigs['sankey-diagram'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('packed-circles') && csvData.length > 0 && packedCirclesRef.current && chartConfigs['packed-circles']) {
            drawPackedCircles(chartConfigs['packed-circles'].category, chartConfigs['packed-circles'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('calendar-heatmap') && csvData.length > 0 && calendarHeatmapRef.current && chartConfigs['calendar-heatmap']) {
            drawCalendarHeatmap(chartConfigs['calendar-heatmap'].date, chartConfigs['calendar-heatmap'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('dendrogram') && csvData.length > 0 && dendrogramRef.current && chartConfigs['dendrogram']) {
            drawDendrogram(chartConfigs['dendrogram'].parent, chartConfigs['dendrogram'].child);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    useEffect(() => {
        if (selectedDashboardType.includes('force-directed-graph') && csvData.length > 0 && forceDirectedGraphRef.current && chartConfigs['force-directed-graph']) {
            drawForceDirectedGraph(chartConfigs['force-directed-graph'].source, chartConfigs['force-directed-graph'].target, chartConfigs['force-directed-graph'].value);
        }
    }, [selectedDashboardType, csvData, chartConfigs]);

    // Função para desenhar o gráfico de barras
    const drawBarChart = (categoryKey, valueKey) => {
        // Limpa o SVG existente
        d3.select(barChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de barras.");
            return;
        }

        const container = d3.select(barChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.6, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 120 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(csvData, d => Number(d[valueKey]))])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(csvData.map(d => d[categoryKey]))
            .range([0, height])
            .padding(0.1);

        const tooltip = d3.select("#d3-tooltip"); // Usa o tooltip global

        svg.selectAll(".bar")
            .data(csvData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => yScale(d[categoryKey]))
            .attr("width", d => xScale(Number(d[valueKey])))
            .attr("height", yScale.bandwidth())
            .attr("rx", 4)
            .attr("ry", 4)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d[categoryKey]}</strong><br/>${valueKey}: <strong>${d[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
                d3.select(this).attr("fill", "#3182ce"); // Cor mais escura ao passar o mouse
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
                d3.select(this).attr("fill", "#4299e1"); // Retorna à cor original
            });

        svg.selectAll(".bar-label")
            .data(csvData)
            .enter().append("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(Number(d[valueKey])) - 5)
            .attr("y", d => yScale(d[categoryKey]) + yScale.bandwidth() / 2 + 5)
            .attr("text-anchor", "end")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => d[valueKey])
            .each(function(d) {
                const textWidth = this.getComputedTextLength();
                if (textWidth + 10 > xScale(Number(d[valueKey]))) {
                    d3.select(this)
                        .attr("x", xScale(Number(d[valueKey])) + 5)
                        .attr("text-anchor", "start")
                        .attr("fill", "#a0aec0");
                }
            });

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Treemap
    const drawTreemap = (categoryKey, valueKey) => {
        d3.select(treemapRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o treemap.");
            return;
        }

        const container = d3.select(treemapRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.75, 500);

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Cria uma estrutura hierárquica para o treemap
        const data = {
            name: "Root",
            children: csvData.map(d => ({ name: d[categoryKey], value: Number(d[valueKey]) }))
        };

        const root = d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        const treemap = d3.treemap()
            .size([width, height])
            .padding(1);

        treemap(root);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        const cell = svg.selectAll("g")
            .data(root.leaves())
            .enter().append("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => color(d.data.name))
            .attr("rx", 6)
            .attr("ry", 6)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d.data.name}</strong><br/>${valueKey}: <strong>${d.data.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
                d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
                d3.select(this).attr("stroke", "none");
            });

        cell.append("text")
            .attr("x", 5)
            .attr("y", 20)
            .text(d => d.data.name)
            .attr("font-size", d => {
                const rectWidth = d.x1 - d.x0;
                const rectHeight = d.y1 - d.y0;
                const maxFontSize = Math.min(rectWidth / d.data.name.length * 1.5, rectHeight / 2, 24);
                return `${maxFontSize}px`;
            })
            .each(function(d) {
                const textElement = d3.select(this);
                const words = d.data.name.split(" ");
                let line = [];
                let lineNumber = 0;
                const lineHeight = 1.1;
                const x = textElement.attr("x");
                const y = textElement.attr("y");
                let tspan = textElement.text(null).append("tspan").attr("x", x).attr("y", y);

                for (let i = 0; i < words.length; i++) {
                    line.push(words[i]);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > (d.x1 - d.x0) - 10 && line.length > 1) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [words[i]];
                        tspan = textElement.append("tspan").attr("x", x).attr("y", y + (++lineNumber * lineHeight + 0.8) + "em").text(words[i]);
                    }
                }
            });
    };

    // Função para desenhar o Gráfico de Barras Empilhadas
    const drawStackedBarChart = (categoryKey, seriesKeys) => {
        d3.select(stackedBarChartRef.current).select("svg").remove();

        if (!categoryKey || !seriesKeys || seriesKeys.length === 0 || !csvData[0][categoryKey]) {
            console.warn("Chaves de categoria ou série inválidas para o gráfico de barras empilhadas.");
            return;
        }

        const container = d3.select(stackedBarChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.75, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Converte valores para números, se necessário
        const dataForStack = csvData.map(d => {
            const newD = { [categoryKey]: d[categoryKey] };
            seriesKeys.forEach(key => {
                newD[key] = +d[key]; // Converte para número
            });
            return newD;
        });

        // Define a função de empilhamento
        const stack = d3.stack()
            .keys(seriesKeys)
            .order(d3.stackOrderNone) // Mantém a ordem das séries
            .offset(d3.stackOffsetNone); // Empilhamento normal

        const stackedData = stack(dataForStack);

        // Escalas
        const xScale = d3.scaleBand()
            .domain(dataForStack.map(d => d[categoryKey]))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])]) // Max do topo da pilha
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10); // Escala de cores para as séries
        const tooltip = d3.select("#d3-tooltip");

        // Desenha as barras empilhadas
        svg.append("g")
            .selectAll("g")
            .data(stackedData)
            .enter().append("g")
                .attr("fill", d => color(d.key)) // Cor para cada série
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
                .attr("x", d => xScale(d.data[categoryKey]))
                .attr("y", d => yScale(d[1]))
                .attr("height", d => yScale(d[0]) - yScale(d[1]))
                .attr("width", xScale.bandwidth())
                .attr("rx", 4)
                .attr("ry", 4)
                .on("mouseover", function(event, d) {
                    const seriesName = d3.select(this.parentNode).datum().key;
                    tooltip.style("opacity", 0.9)
                           .html(`Categoria: <strong>${d.data[categoryKey]}</strong><br/>
                                  Série: <strong>${seriesName}</strong><br/>
                                  Valor: <strong>${d[1] - d[0]}</strong>`) // Valor da fatia
                           .style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY - 28) + "px");
                    d3.select(this).attr("stroke", "#000").attr("stroke-width", 1);
                })
                .on("mouseout", function(d) {
                    tooltip.style("opacity", 0);
                    d3.select(this).attr("stroke", "none");
                });

        // Adiciona eixos
        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();

        // Adiciona uma legenda (opcional, mas útil para gráficos empilhados)
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(seriesKeys.slice().reverse()) // Inverte para corresponder à ordem da pilha
            .enter().append("g")
            .attr("transform", (d, i) => `translate(0,${i * 20})`);

        legend.append("rect")
            .attr("x", width - 19)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", color);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(d => d)
            .attr("fill", "#a0aec0"); // Cor do texto da legenda
    };

    // Função para desenhar o Gráfico de Rosca (Donut Chart)
    const drawDonutChart = (categoryKey, valueKey) => {
        d3.select(donutChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de rosca.");
            return;
        }

        const container = d3.select(donutChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.75, 500);

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const radius = Math.min(width, height) / 2; // Raio do gráfico
        const innerRadius = radius * 0.6; // Raio interno para o donut

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2})`); // Centraliza o gráfico

        // Cria o layout de pizza
        const pie = d3.pie()
            .value(d => Number(d[valueKey]))
            .sort(null); // Não ordena as fatias

        // Cria o gerador de arco para as fatias
        const arc = d3.arc()
            .innerRadius(innerRadius) // Para rosca
            .outerRadius(radius);

        const outerArc = d3.arc() // Para posicionar os rótulos externos
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        // Desenha as fatias
        svg.selectAll('arc')
            .data(pie(csvData))
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data[categoryKey]))
            .attr("stroke", "#2d3748") // Borda entre as fatias
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d.data[categoryKey]}</strong><br/>${valueKey}: <strong>${d.data[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
                d3.select(this).transition().duration(200).attr("transform", `scale(1.03)`);
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
                d3.select(this).transition().duration(200).attr("transform", `scale(1)`);
            });

        // Adiciona os rótulos de texto
        svg.selectAll('text')
            .data(pie(csvData))
            .enter().append('text')
            .attr("transform", d => `translate(${outerArc.centroid(d)})`) // Posição do texto
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => `${d.data[categoryKey]} (${((Number(d.data[valueKey]) / d3.sum(csvData, item => Number(item[valueKey]))) * 100).toFixed(1)}%)`);
    };

    // Função para desenhar o Gráfico de Pizza (Pie Chart)
    const drawPieChart = (categoryKey, valueKey) => {
        d3.select(pieChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de pizza.");
            return;
        }

        const container = d3.select(pieChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.75, 500);

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const radius = Math.min(width, height) / 2; // Raio do gráfico

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2})`); // Centraliza o gráfico

        // Cria o layout de pizza
        const pie = d3.pie()
            .value(d => Number(d[valueKey]))
            .sort(null); // Não ordena as fatias

        // Cria o gerador de arco para as fatias
        const arc = d3.arc()
            .innerRadius(0) // Para pizza (sem raio interno)
            .outerRadius(radius);

        const outerArc = d3.arc() // Para posicionar os rótulos externos
            .innerRadius(radius * 0.9)
            .outerRadius(radius * 0.9);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        // Desenha as fatias
        svg.selectAll('arc')
            .data(pie(csvData))
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data[categoryKey]))
            .attr("stroke", "#2d3748") // Borda entre as fatias
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d.data[categoryKey]}</strong><br/>${valueKey}: <strong>${d.data[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
                d3.select(this).transition().duration(200).attr("transform", `scale(1.03)`);
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
                d3.select(this).transition().duration(200).attr("transform", `scale(1)`);
            });

        // Adiciona os rótulos de texto
        svg.selectAll('text')
            .data(pie(csvData))
            .enter().append('text')
            .attr("transform", d => `translate(${outerArc.centroid(d)})`) // Posição do texto
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => `${d.data[categoryKey]} (${((Number(d.data[valueKey]) / d3.sum(csvData, item => Number(item[valueKey]))) * 100).toFixed(1)}%)`);
    };

    // Função para desenhar o Gráfico de Linhas
    const drawLineChart = (categoryKey, valueKey) => {
        d3.select(lineChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de linhas.");
            return;
        }

        const container = d3.select(lineChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.6, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Assume que a primeira coluna é uma data ou categoria ordinal
        const xScale = d3.scalePoint()
            .domain(csvData.map(d => d[categoryKey]))
            .range([0, width])
            .padding(0.5); // Espaçamento entre os pontos

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(csvData, d => Number(d[valueKey]))])
            .range([height, 0]);

        const line = d3.line()
            .x(d => xScale(d[categoryKey]))
            .y(d => yScale(Number(d[valueKey])));

        const tooltip = d3.select("#d3-tooltip");

        svg.append("path")
            .datum(csvData)
            .attr("fill", "none")
            .attr("stroke", "#4299e1") // Cor da linha
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.selectAll("circle")
            .data(csvData)
            .enter().append("circle")
            .attr("cx", d => xScale(d[categoryKey]))
            .attr("cy", d => yScale(Number(d[valueKey])))
            .attr("r", 5)
            .attr("fill", "#4299e1")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d[categoryKey]}</strong><br/>${valueKey}: <strong>${d[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Gráfico de Área
    const drawAreaChart = (categoryKey, valueKey) => {
        d3.select(areaChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de área.");
            return;
        }

        const container = d3.select(areaChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.6, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scalePoint()
            .domain(csvData.map(d => d[categoryKey]))
            .range([0, width])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(csvData, d => Number(d[valueKey]))])
            .range([height, 0]);

        const area = d3.area()
            .x(d => xScale(d[categoryKey]))
            .y0(height) // Base da área
            .y1(d => yScale(Number(d[valueKey])));

        const tooltip = d3.select("#d3-tooltip");

        svg.append("path")
            .datum(csvData)
            .attr("fill", "#4299e1") // Cor da área
            .attr("opacity", 0.7)
            .attr("d", area);

        svg.append("path") // Adiciona uma linha no topo da área para clareza
            .datum(csvData)
            .attr("fill", "none")
            .attr("stroke", "#3182ce")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => xScale(d[categoryKey]))
                .y(d => yScale(Number(d[valueKey])))
            );

        svg.selectAll("circle")
            .data(csvData)
            .enter().append("circle")
            .attr("cx", d => xScale(d[categoryKey]))
            .attr("cy", d => yScale(Number(d[valueKey])))
            .attr("r", 5)
            .attr("fill", "#4299e1")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d[categoryKey]}</strong><br/>${valueKey}: <strong>${d[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Gráfico de Dispersão
    const drawScatterPlot = (xKey, yKey) => {
        d3.select(scatterPlotRef.current).select("svg").remove();

        if (!xKey || !yKey || !csvData[0][xKey] || !csvData[0][yKey]) {
            console.warn("Chaves X ou Y inválidas para o gráfico de dispersão.");
            return;
        }

        const container = d3.select(scatterPlotRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Certifica-se de que os dados são numéricos
        const numericData = csvData.filter(d => !isNaN(Number(d[xKey])) && !isNaN(Number(d[yKey])))
                                   .map(d => ({ [xKey]: Number(d[xKey]), [yKey]: Number(d[yKey]) }));

        if (numericData.length === 0) {
            setErrorMessage('Não há dados numéricos suficientes para o gráfico de dispersão.');
            return;
        }

        const xScale = d3.scaleLinear()
            .domain(d3.extent(numericData, d => d[xKey]))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(numericData, d => d[yKey]))
            .range([height, 0]);

        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll("circle")
            .data(numericData)
            .enter().append("circle")
            .attr("cx", d => xScale(d[xKey]))
            .attr("cy", d => yScale(d[yKey]))
            .attr("r", 5)
            .attr("fill", "#4299e1")
            .attr("opacity", 0.8)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${xKey}: <strong>${d[xKey]}</strong><br/>${yKey}: <strong>${d[yKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Gráfico de Bolhas
    const drawBubbleChart = (xKey, yKey, sizeKey) => {
        d3.select(bubbleChartRef.current).select("svg").remove();

        if (!xKey || !yKey || !sizeKey || !csvData[0][xKey] || !csvData[0][yKey] || !csvData[0][sizeKey]) {
            setErrorMessage('Para o gráfico de bolhas, o CSV precisa de pelo menos três colunas numéricas (X, Y e Tamanho).');
            return;
        }

        const container = d3.select(bubbleChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const numericData = csvData.filter(d => !isNaN(Number(d[xKey])) && !isNaN(Number(d[yKey])) && !isNaN(Number(d[sizeKey])))
                                   .map(d => ({ [xKey]: Number(d[xKey]), [yKey]: Number(d[yKey]), [sizeKey]: Number(d[sizeKey]) }));

        if (numericData.length === 0) {
            setErrorMessage('Não há dados numéricos suficientes para o gráfico de bolhas.');
            return;
        }

        const xScale = d3.scaleLinear()
            .domain(d3.extent(numericData, d => d[xKey]))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(numericData, d => d[yKey]))
            .range([height, 0]);

        const sizeScale = d3.scaleSqrt() // Escala de raiz quadrada para o tamanho da bolha
            .domain([0, d3.max(numericData, d => d[sizeKey])])
            .range([2, 20]); // Tamanho mínimo e máximo da bolha

        const color = d3.scaleOrdinal(d3.schemeCategory10); // Para colorir bolhas por categoria (se houver)
        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll("circle")
            .data(numericData)
            .enter().append("circle")
            .attr("cx", d => xScale(d[xKey]))
            .attr("cy", d => yScale(d[yKey]))
            .attr("r", d => sizeScale(d[sizeKey]))
            .attr("fill", (d, i) => color(i)) // Ou por uma categoria se houver
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${xKey}: <strong>${d[xKey]}</strong><br/>${yKey}: <strong>${d[yKey]}</strong><br/>${sizeKey}: <strong>${d[sizeKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Heatmap
    const drawHeatmap = (rowKey, colKey, valueKey) => {
        d3.select(heatmapRef.current).select("svg").remove();

        if (!rowKey || !colKey || !valueKey || !csvData[0][rowKey] || !csvData[0][colKey] || !csvData[0][valueKey]) {
            setErrorMessage('Para o mapa de calor, o CSV precisa de pelo menos três colunas (categoria de linha, categoria de coluna, valor numérico).');
            return;
        }

        const container = d3.select(heatmapRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 100 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const rowCategories = Array.from(new Set(csvData.map(d => d[rowKey])));
        const colCategories = Array.from(new Set(csvData.map(d => d[colKey])));

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(colCategories)
            .padding(0.05);

        const yScale = d3.scaleBand()
            .range([height, 0])
            .domain(rowCategories)
            .padding(0.05);

        const colorScale = d3.scaleSequential(d3.interpolateViridis) // Escala de cor para o valor
            .domain([0, d3.max(csvData, d => Number(d[valueKey]))]);

        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll()
            .data(csvData, d => `${d[rowKey]}:${d[colKey]}`)
            .enter().append("rect")
            .attr("x", d => xScale(d[colKey]))
            .attr("y", d => yScale(d[rowKey]))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(Number(d[valueKey])))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${rowKey}: <strong>${d[rowKey]}</strong><br/>${colKey}: <strong>${d[colKey]}</strong><br/>Valor: <strong>${d[valueKey]}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale).tickSize(0));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Gráfico de Barras Radial
    const drawRadialBarChart = (categoryKey, valueKey) => {
        d3.select(radialBarChartRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o gráfico de barras radial.");
            return;
        }

        const container = d3.select(radialBarChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.8, 600); // Um pouco mais alto para o radial

        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const innerRadius = 50;
        const outerRadius = Math.min(width, height) / 2;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2})`);

        const data = csvData.map(d => ({
            name: d[categoryKey],
            value: Number(d[valueKey])
        })).sort((a, b) => a.value - b.value); // Ordena para melhor visualização radial

        const xScale = d3.scaleBand()
            .range([0, 2 * Math.PI]) // Círculo completo
            .align(0)
            .domain(data.map(d => d.name));

        const yScale = d3.scaleRadial()
            .range([innerRadius, outerRadius])
            .domain([0, d3.max(data, d => d.value)]);

        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll("path")
            .data(data)
            .enter().append("path")
            .attr("fill", "#4299e1")
            .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(d => yScale(d.value))
                .startAngle(d => xScale(d.name))
                .endAngle(d => xScale(d.name) + xScale.bandwidth())
                .padAngle(0.01)
                .padRadius(innerRadius))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d.name}</strong><br/>${valueKey}: <strong>${d.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        // Adiciona rótulos de texto
        svg.selectAll("g")
            .data(data)
            .enter().append("g")
            .attr("text-anchor", d => (xScale(d.name) + xScale.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("transform", d => `
                rotate(${(xScale(d.name) + xScale.bandwidth() / 2) * 180 / Math.PI - 90})
                translate(${yScale(d.value) + 10},0)
            `)
            .append("text")
            .text(d => d.name)
            .attr("fill", "#a0aec0")
            .attr("font-size", "10px")
            .attr("transform", d => (xScale(d.name) + xScale.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)")
            .style("dominant-baseline", "middle");
    };

    // Função para desenhar o Gráfico de Medidor (Gauge Chart)
    const drawGaugeChart = (valueKey) => {
        d3.select(gaugeChartRef.current).select("svg").remove();

        if (!valueKey || csvData.length === 0 || isNaN(Number(csvData[0][valueKey]))) {
            setErrorMessage('Para o gráfico de medidor, o CSV precisa de pelo menos uma coluna numérica para o valor.');
            return;
        }

        const container = d3.select(gaugeChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 300); // Altura menor para medidor

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2 + 50})`); // Ajusta para o centro inferior

        const value = Number(csvData[0][valueKey]); // Pega o primeiro valor numérico
        const maxValue = d3.max(csvData, d => Number(d[valueKey])) * 1.2 || 100; // Max value for gauge, or 100 if only one value

        const arc = d3.arc()
            .innerRadius(Math.min(width, height) / 2 * 0.6)
            .outerRadius(Math.min(width, height) / 2 * 0.9);

        const pie = d3.pie()
            .startAngle(-Math.PI * 0.75) // Começa em -135 graus
            .endAngle(Math.PI * 0.75)   // Termina em 135 graus
            .value(d => d)
            .sort(null);

        const data = [value, maxValue - value]; // Para preenchimento e restante

        const color = d3.scaleOrdinal()
            .domain([0, 1])
            .range(["#4299e1", "#4a5568"]); // Cor de preenchimento e cor de fundo

        svg.selectAll("path")
            .data(pie(data))
            .enter().append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => color(i));

        // Adiciona o valor no centro
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("y", -10)
            .attr("fill", "#e2e8f0")
            .attr("font-size", "3em")
            .text(value);

        // Adiciona o rótulo
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 30)
            .attr("fill", "#a0aec0")
            .attr("font-size", "1em")
            .text(valueKey); // Rótulo da coluna selecionada
    };

    // Função para desenhar o Gráfico de Área Empilhada
    const drawStackedAreaChart = (categoryKey, seriesKeys) => {
        d3.select(stackedAreaChartRef.current).select("svg").remove();

        if (!categoryKey || !seriesKeys || seriesKeys.length === 0 || !csvData[0][categoryKey]) {
            console.warn("Chaves de categoria ou série inválidas para o gráfico de área empilhada.");
            return;
        }

        const container = d3.select(stackedAreaChartRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.6, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const dataForStack = csvData.map(d => {
            const newD = { [categoryKey]: d[categoryKey] };
            seriesKeys.forEach(key => {
                newD[key] = +d[key];
            });
            return newD;
        });

        const stack = d3.stack()
            .keys(seriesKeys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const stackedData = stack(dataForStack);

        const xScale = d3.scalePoint()
            .domain(dataForStack.map(d => d[categoryKey]))
            .range([0, width])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        const area = d3.area()
            .x(d => xScale(d.data[categoryKey]))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]));

        svg.selectAll("mylayers")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("class", "myArea")
            .style("fill", d => color(d.key))
            .attr("d", area)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Série: <strong>${d.key}</strong><br/>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Streamgraph
    const drawStreamgraph = (categoryKey, seriesKeys) => {
        d3.select(streamgraphRef.current).select("svg").remove();

        if (!categoryKey || !seriesKeys || seriesKeys.length === 0 || !csvData[0][categoryKey]) {
            console.warn("Chaves de categoria ou série inválidas para o streamgraph.");
            return;
        }

        const container = d3.select(streamgraphRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.6, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const dataForStack = csvData.map(d => {
            const newD = { [categoryKey]: d[categoryKey] };
            seriesKeys.forEach(key => {
                newD[key] = +d[key];
            });
            return newD;
        });

        const stack = d3.stack()
            .keys(seriesKeys)
            .offset(d3.stackOffsetWiggle) // Offset para streamgraph
            .order(d3.stackOrderInsideOut); // Ordem para streamgraph

        const stackedData = stack(dataForStack);

        const xScale = d3.scalePoint()
            .domain(dataForStack.map(d => d[categoryKey]))
            .range([0, width])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([d3.min(stackedData, layer => d3.min(layer, d => d[0])), d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        const area = d3.area()
            .x(d => xScale(d.data[categoryKey]))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]));

        svg.selectAll("mylayers")
            .data(stackedData)
            .enter()
            .append("path")
            .attr("class", "myArea")
            .style("fill", d => color(d.key))
            .attr("d", area)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Série: <strong>${d.key}</strong><br/>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Box Plot
    const drawBoxPlot = (categoryKey, valueKey) => {
        d3.select(boxPlotRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o box plot.");
            return;
        }

        const container = d3.select(boxPlotRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Processa os dados para box plot
        const dataByGroup = d3.group(csvData, d => d[categoryKey]);
        const boxPlotData = Array.from(dataByGroup, ([key, values]) => {
            const numericValues = values.map(d => Number(d[valueKey])).sort(d3.ascending);
            const q1 = d3.quantile(numericValues, 0.25);
            const median = d3.quantile(numericValues, 0.5);
            const q3 = d3.quantile(numericValues, 0.75);
            const interQuartileRange = q3 - q1;
            const min = q1 - 1.5 * interQuartileRange;
            const max = q3 + 1.5 * interQuartileRange;
            return { key, q1, median, q3, min, max, values: numericValues };
        });

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(boxPlotData.map(d => d.key))
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([d3.min(boxPlotData, d => d.min), d3.max(boxPlotData, d => d.max)])
            .range([height, 0]);

        const tooltip = d3.select("#d3-tooltip");

        // Desenha os box plots
        svg.selectAll("vertLines")
            .data(boxPlotData)
            .enter()
            .append("line")
                .attr("x1", d => xScale(d.key) + xScale.bandwidth() / 2)
                .attr("x2", d => xScale(d.key) + xScale.bandwidth() / 2)
                .attr("y1", d => yScale(d.min))
                .attr("y2", d => yScale(d.max))
                .attr("stroke", "white");

        svg.selectAll("boxes")
            .data(boxPlotData)
            .enter()
            .append("rect")
                .attr("x", d => xScale(d.key))
                .attr("y", d => yScale(d.q3))
                .attr("height", d => yScale(d.q1) - yScale(d.q3))
                .attr("width", xScale.bandwidth())
                .attr("stroke", "white")
                .attr("fill", "#4299e1")
                .attr("fill-opacity", 0.7)
                .on("mouseover", function(event, d) {
                    tooltip.style("opacity", 0.9)
                           .html(`Categoria: <strong>${d.key}</strong><br/>
                                  Mediana: <strong>${d.median.toFixed(2)}</strong><br/>
                                  Q1: <strong>${d.q1.toFixed(2)}</strong><br/>
                                  Q3: <strong>${d.q3.toFixed(2)}</strong><br/>
                                  Min: <strong>${d.min.toFixed(2)}</strong><br/>
                                  Max: <strong>${d.max.toFixed(2)}</strong>`)
                           .style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.style("opacity", 0);
                });

        svg.selectAll("medianLines")
            .data(boxPlotData)
            .enter()
            .append("line")
                .attr("x1", d => xScale(d.key))
                .attr("x2", d => xScale(d.key) + xScale.bandwidth())
                .attr("y1", d => yScale(d.median))
                .attr("y2", d => yScale(d.median))
                .attr("stroke", "red")
                .attr("stroke-width", 2);

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();
    };

    // Função para desenhar o Violin Plot
    const drawViolinPlot = (categoryKey, valueKey) => {
        d3.select(violinPlotRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para o violin plot.");
            return;
        }

        const container = d3.select(violinPlotRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const dataByGroup = d3.group(csvData, d => d[categoryKey]);

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(Array.from(dataByGroup.keys()))
            .padding(0.05);

        const yScale = d3.scaleLinear()
            .domain([d3.min(csvData, d => Number(d[valueKey])), d3.max(csvData, d => Number(d[valueKey]))])
            .range([height, 0]);

        const kde = kernelDensityEstimator(kernelEpanechnikov(9), yScale.ticks(40));

        const violinData = Array.from(dataByGroup, ([key, values]) => {
            const numericValues = values.map(d => Number(d[valueKey]));
            const density = kde(numericValues);
            return { key, density };
        });

        const maxDensity = d3.max(violinData, d => d3.max(d.density, dd => dd[1]));
        const xViolin = d3.scaleLinear()
            .range([0, xScale.bandwidth()])
            .domain([-maxDensity, maxDensity]);

        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll("violins")
            .data(violinData)
            .enter()
            .append("g")
            .attr("transform", d => `translate(${xScale(d.key)},0)`)
            .append("path")
                .datum(d => d.density)
                .attr("stroke", "none")
                .attr("fill", "#4299e1")
                .attr("fill-opacity", 0.6)
                .attr("d", d3.area()
                    .x0(dd => xViolin(-dd[1]))
                    .x1(dd => xViolin(dd[1]))
                    .y(dd => yScale(dd[0]))
                    .curve(d3.curveBasis))
                .on("mouseover", function(event, d) {
                    const category = d3.select(this.parentNode).datum().key;
                    tooltip.style("opacity", 0.9)
                           .html(`Categoria: <strong>${category}</strong><br/>Distribuição de ${valueKey}`)
                           .style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.style("opacity", 0);
                });

        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));

        svg.select(".y-axis .domain").remove();
        svg.select(".x-axis .domain").remove();

        function kernelDensityEstimator(kernel, X) {
            return function(sample) {
                return X.map(x => [x, d3.mean(sample, s => kernel(x - s))]);
            };
        }

        function kernelEpanechnikov(k) {
            return u => Math.abs(u /= k) <= 1 ? 0.75 * (1 - u * u) / k : 0;
        }
    };

    // Função para desenhar Coordenadas Paralelas
    const drawParallelCoordinates = (seriesKeys) => {
        d3.select(parallelCoordinatesRef.current).select("svg").remove();

        if (!seriesKeys || seriesKeys.length < 2) {
            setErrorMessage('Para Coordenadas Paralelas, o CSV precisa de pelo menos duas colunas numéricas para as séries.');
            return;
        }

        const container = d3.select(parallelCoordinatesRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 30, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Filtra apenas as colunas numéricas para os eixos
        const numericSeriesKeys = seriesKeys.filter(key => !isNaN(Number(csvData[0][key])));
        if (numericSeriesKeys.length < 2) {
            setErrorMessage('Não há colunas numéricas suficientes para Coordenadas Paralelas.');
            return;
        }

        const y = {};
        for (let i in numericSeriesKeys) {
            const name = numericSeriesKeys[i];
            y[name] = d3.scaleLinear()
                .domain(d3.extent(csvData, d => Number(d[name])))
                .range([height, 0]);
        }

        const x = d3.scalePoint()
            .range([0, width])
            .padding(1)
            .domain(numericSeriesKeys);

        const path = d => d3.line()(numericSeriesKeys.map(p => [x(p), y[p](Number(d[p]))]));

        const tooltip = d3.select("#d3-tooltip");

        svg.selectAll("myPath")
            .data(csvData)
            .enter().append("path")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#69b3a2")
            .style("opacity", 0.5)
            .on("mouseover", function(event, d) {
                let htmlContent = "<strong>Dados:</strong><br/>";
                numericSeriesKeys.forEach(key => {
                    htmlContent += `${key}: <strong>${d[key]}</strong><br/>`;
                });
                tooltip.style("opacity", 0.9)
                       .html(htmlContent)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        svg.selectAll("myAxis")
            .data(numericSeriesKeys)
            .enter().append("g")
            .attr("transform", d => `translate(${x(d)},0)`)
            .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
            .append("text")
                .style("text-anchor", "middle")
                .attr("y", -9)
                .text(d => d)
                .style("fill", "#a0aec0");
    };

    // Função para desenhar o Diagrama de Cordas (simplificado)
    const drawChordDiagram = (sourceKey, targetKey, valueKey) => {
        d3.select(chordDiagramRef.current).select("svg").remove();

        if (!sourceKey || !targetKey || !valueKey || !csvData[0][sourceKey] || !csvData[0][targetKey] || !csvData[0][valueKey]) {
            setErrorMessage('Para o Diagrama de Cordas, o CSV precisa de colunas para Origem, Destino e Valor.');
            return;
        }

        const container = d3.select(chordDiagramRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.8, 600);

        const outerRadius = Math.min(containerWidth, containerHeight) / 2 - 40;
        const innerRadius = outerRadius - 30;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${containerWidth / 2},${containerHeight / 2})`);

        const names = Array.from(new Set(csvData.flatMap(d => [d[sourceKey], d[targetKey]])));
        const nameToIndex = new Map(names.map((name, i) => [name, i]));
        const matrix = Array.from({ length: names.length }, () => new Array(names.length).fill(0));

        csvData.forEach(d => {
            const sourceIndex = nameToIndex.get(d[sourceKey]);
            const targetIndex = nameToIndex.get(d[targetKey]);
            const value = Number(d[valueKey]);
            if (sourceIndex !== undefined && targetIndex !== undefined && !isNaN(value)) {
                matrix[sourceIndex][targetIndex] += value;
            }
        });

        const chordLayout = chord() // Usando a função chord importada diretamente
            .padAngle(0.05)
            .sortSubgroups(d3.descending)
            (matrix);

        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        const ribbonLayout = ribbon() // Usando a função ribbon importada diretamente
            .radius(innerRadius);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        const group = svg.append("g")
            .selectAll("g")
            .data(chordLayout.groups)
            .enter().append("g");

        group.append("path")
            .attr("fill", d => color(d.index))
            .attr("stroke", d => d3.rgb(color(d.index)).darker())
            .attr("d", arc)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Grupo: <strong>${names[d.index]}</strong><br/>Valor Total: <strong>${d.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        group.append("text")
            .each(d => { d.outerRadius = outerRadius; })
            .attr("transform", d => `rotate(${(d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90}) translate(${d.outerRadius + 10},0)`)
            .attr("text-anchor", d => ((d.startAngle + d.endAngle) / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("fill", "#a0aec0")
            .attr("font-size", "10px")
            .text(d => names[d.index]);

        svg.append("g")
            .attr("fill-opacity", 0.67)
            .selectAll("path")
            .data(chordLayout)
            .enter().append("path")
            .attr("d", ribbonLayout)
            .attr("fill", d => color(d.source.index))
            .attr("stroke", d => d3.rgb(color(d.source.index)).darker())
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`De: <strong>${names[d.source.index]}</strong> para <strong>${names[d.target.index]}</strong><br/>Valor: <strong>${d.source.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });
    };

    // Função para desenhar o Diagrama de Sankey (simplificado)
    const drawSankeyDiagram = (sourceKey, targetKey, valueKey) => {
        d3.select(sankeyDiagramRef.current).select("svg").remove();

        if (!sourceKey || !targetKey || !valueKey || !csvData[0][sourceKey] || !csvData[0][targetKey] || !csvData[0][valueKey]) {
            setErrorMessage('Para o Diagrama de Sankey, o CSV precisa de colunas para Origem, Destino e Valor.');
            return;
        }

        const container = d3.select(sankeyDiagramRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.7, 500);

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Cria nós e links
        const nodes = Array.from(new Set(csvData.flatMap(d => [d[sourceKey], d[targetKey]]))).map(name => ({ name }));
        const links = csvData.map(d => ({
            source: d[sourceKey],
            target: d[targetKey],
            value: Number(d[valueKey])
        })).filter(d => !isNaN(d.value));

        // Mapeia nomes para índices para o Sankey
        const nodeMap = new Map();
        nodes.forEach((node, i) => nodeMap.set(node.name, i));
        links.forEach(link => {
            link.source = nodeMap.get(link.source);
            link.target = nodeMap.get(link.target);
        });

        const sankeyLayout = sankey() // Usando a função sankey importada diretamente
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[1, 1], [width - 1, height - 6]]);

        const { nodes: graphNodes, links: graphLinks } = sankeyLayout({ nodes: nodes, links: links });

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        // Desenha os links
        svg.append("g")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.5)
            .selectAll("path")
            .data(graphLinks)
            .enter().append("path")
                .attr("d", sankeyLinkHorizontal()) // Usando a função sankeyLinkHorizontal importada diretamente
                .attr("stroke", d => color(d.source.name))
                .attr("stroke-width", d => Math.max(1, d.width))
                .on("mouseover", function(event, d) {
                    tooltip.style("opacity", 0.9)
                           .html(`Fluxo: <strong>${d.source.name}</strong> para <strong>${d.target.name}</strong><br/>Valor: <strong>${d.value}</strong>`)
                           .style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.style("opacity", 0);
                });

        // Desenha os nós
        const node = svg.append("g")
            .selectAll("g")
            .data(graphNodes)
            .enter().append("g");

        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.name))
            .attr("stroke", "#000")
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Nó: <strong>${d.name}</strong><br/>Valor: <strong>${d.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        node.append("text")
            .attr("x", d => d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(d => d.name)
            .filter(d => d.x0 < width / 2)
            .attr("x", d => d.x1 + 6)
            .attr("text-anchor", "start")
            .attr("fill", "#a0aec0");
    };

    // Função para desenhar Círculos Empacotados (Packed Circles)
    const drawPackedCircles = (categoryKey, valueKey) => {
        d3.select(packedCirclesRef.current).select("svg").remove();

        if (!categoryKey || !valueKey || !csvData[0][categoryKey] || !csvData[0][valueKey]) {
            console.warn("Chaves de categoria ou valor inválidas para círculos empacotados.");
            return;
        }

        const container = d3.select(packedCirclesRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.8, 600);

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const data = {
            name: "root",
            children: csvData.map(d => ({ name: d[categoryKey], value: Number(d[valueKey]) }))
        };

        const root = d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        d3.pack()
            .size([width, height])
            .padding(2)
            (root);

        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const tooltip = d3.select("#d3-tooltip");

        const node = svg.selectAll(".node")
            .data(root.descendants().slice(1)) // Exclui o nó raiz
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        node.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => color(d.data.name))
            .attr("opacity", 0.7)
            .attr("stroke", "#2d3748")
            .attr("stroke-width", 1.5)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`${categoryKey}: <strong>${d.data.name}</strong><br/>${valueKey}: <strong>${d.data.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        node.append("text")
            .attr("dy", "0.3em")
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", d => Math.min(d.r / 3, 12) + "px") // Ajusta o tamanho da fonte
            .text(d => d.data.name)
            .filter(d => d.r > 20); // Mostra texto apenas para círculos maiores
    };

    // Função para desenhar o Mapa de Calor de Calendário
    const drawCalendarHeatmap = (dateKey, valueKey) => {
        d3.select(calendarHeatmapRef.current).select("svg").remove();

        if (!dateKey || !valueKey || !csvData[0][dateKey] || !csvData[0][valueKey]) {
            setErrorMessage('Para o Mapa de Calor de Calendário, o CSV precisa de colunas para Data e Valor.');
            return;
        }

        const container = d3.select(calendarHeatmapRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.4, 300);

        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const parseDate = d3.timeParse("%Y-%m-%d"); // Assumindo formato YYYY-MM-DD
        const data = csvData.map(d => ({
            date: parseDate(d[dateKey]),
            value: Number(d[valueKey])
        })).filter(d => d.date && !isNaN(d.value));

        if (data.length === 0) {
            setErrorMessage('Não há dados de data/valor válidos para o mapa de calor de calendário.');
            return;
        }

        const years = Array.from(new Set(data.map(d => d.date.getFullYear())));
        const cellSize = 17; // Tamanho de cada célula do dia
        const yearHeight = cellSize * 7 + 20; // Altura para cada ano

        const colorScale = d3.scaleSequential(d3.interpolateGreens)
            .domain([0, d3.max(data, d => d.value)]);

        const format = d3.timeFormat("%Y-%m-%d");
        const tooltip = d3.select("#d3-tooltip");

        years.forEach((year, yearIndex) => {
            const yearData = data.filter(d => d.date.getFullYear() === year);

            const yearSvg = svg.append("g")
                .attr("transform", `translate(0, ${yearIndex * yearHeight})`);

            yearSvg.append("text")
                .attr("x", -20)
                .attr("y", cellSize * 3.5)
                .attr("text-anchor", "middle")
                .attr("fill", "#a0aec0")
                .attr("font-size", "14px")
                .text(year);

            yearSvg.selectAll("rect")
                .data(yearData)
                .enter().append("rect")
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("x", d => d3.timeWeek.count(d3.timeYear(d.date), d.date) * cellSize)
                    .attr("y", d => d.date.getDay() * cellSize)
                    .attr("fill", d => colorScale(d.value))
                    .attr("stroke", "#4a5568")
                    .attr("stroke-width", 0.5)
                    .on("mouseover", function(event, d) {
                        tooltip.style("opacity", 0.9)
                               .html(`Data: <strong>${format(d.date)}</strong><br/>Valor: <strong>${d.value}</strong>`)
                               .style("left", (event.pageX + 10) + "px")
                               .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function(d) {
                        tooltip.style("opacity", 0);
                    });

            // Adiciona rótulos dos meses
            const monthLabels = d3.timeMonths(new Date(year, 0, 1), new Date(year + 1, 0, 1));
            yearSvg.selectAll(".month-label")
                .data(monthLabels)
                .enter().append("text")
                .attr("class", "month-label")
                .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
                .attr("y", -5)
                .attr("fill", "#a0aec0")
                .attr("font-size", "10px")
                .text(d3.timeFormat("%b"));
        });
    };

    // Função para desenhar o Dendrogram (simplificado)
    const drawDendrogram = (parentKey, childKey) => {
        d3.select(dendrogramRef.current).select("svg").remove();

        if (!parentKey || !childKey || csvData.length === 0 || !csvData[0].hasOwnProperty(parentKey) || !csvData[0].hasOwnProperty(childKey)) {
            setErrorMessage('Para o Dendrograma, o CSV precisa de colunas válidas para Pai e Filho.');
            return;
        }

        const container = d3.select(dendrogramRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.8, 600);

        const margin = { top: 20, right: 120, bottom: 20, left: 120 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create a set of all unique node IDs (from childKey)
        const childIds = new Set(csvData.map(d => String(d[childKey])));

        // Prepare data for d3.stratify
        // Each object needs an 'id' and 'parentId'
        const stratifyData = [];
        const seenNodes = new Set(); // To avoid duplicate nodes if a node appears multiple times as a child

        csvData.forEach(d => {
            const childId = String(d[childKey]);
            const parentId = String(d[parentKey]);

            // Add the child node
            if (!seenNodes.has(childId)) {
                stratifyData.push({ id: childId, parentId: parentId === "" ? null : parentId });
                seenNodes.add(childId);
            } else {
                // If child already seen, update its parent if it was previously set to null (e.g., if it was assumed root)
                const existingNode = stratifyData.find(node => node.id === childId);
                if (existingNode && existingNode.parentId === null && parentId !== "") {
                    existingNode.parentId = parentId;
                }
            }

            // Ensure the parent node also exists in the data, even if it's not a child of anything
            if (parentId !== "" && parentId !== null && !seenNodes.has(parentId)) {
                stratifyData.push({ id: parentId, parentId: null }); // Assume parent is a root if not explicitly defined as a child
                seenNodes.add(parentId);
            }
        });

        // Ensure there's a single root. If multiple nodes have null/empty parentId, create a dummy root.
        const potentialRoots = stratifyData.filter(d => d.parentId === null || d.parentId === "");
        let finalStratifyData = stratifyData;

        if (potentialRoots.length > 1) {
            const dummyRootId = "Dendrogram_Root";
            // Check if dummyRootId already exists as a child, if so, pick another name
            if (childIds.has(dummyRootId) || seenNodes.has(dummyRootId)) {
                let counter = 0;
                let newDummyRootId = dummyRootId;
                while (childIds.has(newDummyRootId) || seenNodes.has(newDummyRootId)) {
                    counter++;
                    newDummyRootId = `${dummyRootId}_${counter}`;
                }
                finalStratifyData = [{ id: newDummyRootId, parentId: null }, ...stratifyData.map(d => {
                    if (d.parentId === null || d.parentId === "") {
                        return { ...d, parentId: newDummyRootId };
                    }
                    return d;
                })];
            } else {
                finalStratifyData = [{ id: dummyRootId, parentId: null }, ...stratifyData.map(d => {
                    if (d.parentId === null || d.parentId === "") {
                        return { ...d, parentId: dummyRootId };
                    }
                    return d;
                })];
            }
        } else if (potentialRoots.length === 0 && stratifyData.length > 0) {
            // If no root is found, but there's data, assume all nodes are children of a dummy root.
            const dummyRootId = "Dendrogram_Root";
             if (childIds.has(dummyRootId) || seenNodes.has(dummyRootId)) {
                let counter = 0;
                let newDummyRootId = dummyRootId;
                while (childIds.has(newDummyRootId) || seenNodes.has(newDummyRootId)) {
                    counter++;
                    newDummyRootId = `${dummyRootId}_${counter}`;
                }
                finalStratifyData = [{ id: newDummyRootId, parentId: null }, ...stratifyData.map(d => ({ ...d, parentId: newDummyRootId }))];
            } else {
                finalStratifyData = [{ id: dummyRootId, parentId: null }, ...stratifyData.map(d => ({ ...d, parentId: dummyRootId }))];
            }
        }

        const stratify = d3.stratify()
            .id(d => d.id)
            .parentId(d => d.parentId);

        let root;
        try {
            root = stratify(finalStratifyData);
        } catch (e) {
            console.error("Error creating dendrogram hierarchy:", e);
            setErrorMessage(`Erro ao construir o dendrograma: ${e.message}. Verifique se as relações pai-filho no CSV são válidas e se todos os pais existem como filhos em algum lugar, ou se há um único nó raiz com pai vazio.`);
            return;
        }

        const cluster = d3.cluster()
            .size([height, width - 160]); // Ajusta o tamanho para caber no SVG

        cluster(root);

        const tooltip = d3.select("#d3-tooltip");

        // Desenha os links
        svg.selectAll('path')
            .data(root.links())
            .enter().append('path')
            .attr("d", d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);

        // Desenha os nós
        const node = svg.selectAll('g')
            .data(root.descendants())
            .enter().append('g')
            .attr("transform", d => `translate(${d.y},${d.x})`);

        node.append('circle')
            .attr('r', 5)
            .attr('fill', '#4299e1')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Nó: <strong>${d.id}</strong><br/>Pai: <strong>${d.parent ? d.parent.id : 'Nenhum'}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        node.append('text')
            .attr("dy", "0.31em")
            .attr("x", d => d.children ? -8 : 8)
            .attr("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.id)
            .attr("fill", "#a0aec0")
            .attr("font-size", "12px");
    };

    // Função para desenhar o Grafo de Força Dirigida (simplificado)
    const drawForceDirectedGraph = (sourceKey, targetKey, valueKey) => {
        d3.select(forceDirectedGraphRef.current).select("svg").remove();

        if (!sourceKey || !targetKey || !csvData[0][sourceKey] || !csvData[0][targetKey]) {
            setErrorMessage('Para o Grafo de Força Dirigida, o CSV precisa de colunas para Origem e Destino.');
            return;
        }

        const container = d3.select(forceDirectedGraphRef.current);
        const containerWidth = container.node().getBoundingClientRect().width;
        const containerHeight = Math.min(containerWidth * 0.8, 600);

        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const links = csvData.map(d => ({
            source: d[sourceKey],
            target: d[targetKey],
            value: valueKey ? Number(d[valueKey]) : 1 // Usa o valor se fornecido, senão 1
        })).filter(d => !isNaN(d.value));

        const nodes = Array.from(new Set(links.flatMap(l => [l.source, l.target])), id => ({ id }));

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const tooltip = d3.select("#d3-tooltip");

        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke-width", d => Math.sqrt(d.value))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Conexão: <strong>${d.source.id}</strong> - <strong>${d.target.id}</strong><br/>Valor: <strong>${d.value}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", 5)
            .attr("fill", "#4299e1")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", 0.9)
                       .html(`Nó: <strong>${d.id}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        node.append("title")
            .text(d => d.id);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    };


    // Componente para configurar os campos do gráfico
    const ChartConfigurator = ({ chartType, config, headers, onConfigChange }) => {
        const renderFields = () => {
            switch (chartType) {
                case 'cards':
                case 'bar-chart':
                case 'donut-chart':
                case 'pie-chart':
                case 'line-chart':
                case 'area-chart':
                case 'radial-bar-chart':
                case 'gauge-chart':
                case 'box-plot':
                case 'violin-plot':
                case 'packed-circles':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]"> {/* Adicionado flex-1 e min-w */}
                                <label className="text-gray-400 text-sm mb-1">Categoria:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.category || ''}
                                    onChange={(e) => onConfigChange(chartType, 'category', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]"> {/* Adicionado flex-1 e min-w */}
                                <label className="text-gray-400 text-sm mb-1">Valor:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.value || ''}
                                    onChange={(e) => onConfigChange(chartType, 'value', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                case 'scatter-plot':
                case 'bubble-chart':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Eixo X:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.x || ''}
                                    onChange={(e) => onConfigChange(chartType, 'x', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Eixo Y:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.y || ''}
                                    onChange={(e) => onConfigChange(chartType, 'y', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            {chartType === 'bubble-chart' && (
                                <div className="flex flex-col flex-1 min-w-[150px]">
                                    <label className="text-gray-400 text-sm mb-1">Tamanho da Bolha:</label>
                                    <select
                                        className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                        value={config.size || ''}
                                        onChange={(e) => onConfigChange(chartType, 'size', e.target.value)}
                                    >
                                        {headers.map(header => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    );
                case 'stacked-bar-chart':
                case 'stacked-area-chart':
                case 'streamgraph':
                case 'parallel-coordinates':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Categoria (ou Eixo X):</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.category || ''}
                                    onChange={(e) => onConfigChange(chartType, 'category', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Séries (segure CTRL/CMD para selecionar múltiplas):</label>
                                <select
                                    multiple
                                    className="p-2 rounded bg-gray-600 text-gray-100 h-24 w-full"
                                    value={config.series || []}
                                    onChange={(e) => onConfigChange(chartType, 'series', Array.from(e.target.selectedOptions, option => option.value))}
                                >
                                    {headers.filter(h => h !== config.category).map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                case 'heatmap':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Linha (Categoria):</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.row || ''}
                                    onChange={(e) => onConfigChange(chartType, 'row', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Coluna (Categoria):</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.col || ''}
                                    onChange={(e) => onConfigChange(chartType, 'col', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Valor:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.value || ''}
                                    onChange={(e) => onConfigChange(chartType, 'value', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                case 'calendar-heatmap':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Campo de Data (YYYY-MM-DD):</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.date || ''}
                                    onChange={(e) => onConfigChange(chartType, 'date', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Valor:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.value || ''}
                                    onChange={(e) => onConfigChange(chartType, 'value', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                case 'chord-diagram':
                case 'sankey-diagram':
                case 'force-directed-graph':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Origem:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.source || ''}
                                    onChange={(e) => onConfigChange(chartType, 'source', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Destino:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.target || ''}
                                    onChange={(e) => onConfigChange(chartType, 'target', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Valor (Opcional):</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.value || ''}
                                    onChange={(e) => onConfigChange(chartType, 'value', e.target.value)}
                                >
                                    <option value="">Nenhum</option>
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                case 'dendrogram':
                    return (
                        <>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Pai:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.parent || ''}
                                    onChange={(e) => onConfigChange(chartType, 'parent', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col flex-1 min-w-[150px]">
                                <label className="text-gray-400 text-sm mb-1">Filho:</label>
                                <select
                                    className="p-2 rounded bg-gray-600 text-gray-100 w-full"
                                    value={config.child || ''}
                                    onChange={(e) => onConfigChange(chartType, 'child', e.target.value)}
                                >
                                    {headers.map(header => (
                                        <option key={header} value={header}>{header}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    );
                default:
                    return <p className="text-gray-400">Nenhuma configuração específica para este gráfico.</p>;
            }
        };

        return (
            <div className="bg-gray-700 p-4 rounded-lg shadow-md mb-4 w-full"> {/* Adicionado w-full aqui */}
                <h4 className="text-lg font-semibold text-gray-100 mb-3">{chartType.replace('-', ' ').toUpperCase()} Configuração</h4>
                <div className="flex flex-wrap gap-3"> {/* Alterado para flex-wrap e gap */}
                    {renderFields()}
                </div>
            </div>
        );
    };


    // Renderiza o dashboard selecionado
    const renderDashboard = () => {
        if (csvData.length === 0) {
            return <p className="text-gray-400 text-center">Faça o upload de um arquivo CSV para visualizar os dados.</p>;
        }

        if (selectedDashboardType.length === 0) {
            return <p className="text-gray-400 text-center">Selecione um ou mais tipos de dashboard para visualizar.</p>;
        }

        return (
            <div className="grid gap-6 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {selectedDashboardType.includes('cards') && chartConfigs['cards'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Cards de Métricas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="cards"
                                config={chartConfigs['cards']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div className="grid gap-4 grid-cols-1"> {/* Inner grid for cards */}
                            {csvData.map((item, index) => {
                                const name = item[chartConfigs['cards'].category];
                                const value = item[chartConfigs['cards'].value];
                                const label = chartConfigs['cards'].value;

                                return (
                                    <div key={index} className="bg-gray-600 rounded-lg p-4 flex flex-col">
                                        <div className="text-lg font-medium text-gray-200">{name}</div>
                                        <div className="flex items-baseline mt-1">
                                            <span className="text-3xl font-bold text-white">{value}</span>
                                            <span className="text-sm ml-2 text-gray-400">{label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {selectedDashboardType.includes('bar-chart') && chartConfigs['bar-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Barras</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="bar-chart"
                                config={chartConfigs['bar-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={barChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('treemap') && chartConfigs['treemap'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Treemap</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="treemap"
                                config={chartConfigs['treemap']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={treemapRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('stacked-bar-chart') && chartConfigs['stacked-bar-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Barras Empilhadas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="stacked-bar-chart"
                                config={chartConfigs['stacked-bar-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={stackedBarChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('donut-chart') && chartConfigs['donut-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Rosca</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="donut-chart"
                                config={chartConfigs['donut-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={donutChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('pie-chart') && chartConfigs['pie-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Pizza</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="pie-chart"
                                config={chartConfigs['pie-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={pieChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('line-chart') && chartConfigs['line-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Linhas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="line-chart"
                                config={chartConfigs['line-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={lineChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('area-chart') && chartConfigs['area-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Área</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="area-chart"
                                config={chartConfigs['area-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={areaChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('scatter-plot') && chartConfigs['scatter-plot'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Dispersão</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="scatter-plot"
                                config={chartConfigs['scatter-plot']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={scatterPlotRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('bubble-chart') && chartConfigs['bubble-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Bolhas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="bubble-chart"
                                config={chartConfigs['bubble-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={bubbleChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('heatmap') && chartConfigs['heatmap'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Mapa de Calor</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="heatmap"
                                config={chartConfigs['heatmap']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={heatmapRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('radial-bar-chart') && chartConfigs['radial-bar-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Barras Radiais</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="radial-bar-chart"
                                config={chartConfigs['radial-bar-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={radialBarChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                 {selectedDashboardType.includes('gauge-chart') && chartConfigs['gauge-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Gráfico de Medidor</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="gauge-chart"
                                config={chartConfigs['gauge-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={gaugeChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('stacked-area-chart') && chartConfigs['stacked-area-chart'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Área Empilhada</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="stacked-area-chart"
                                config={chartConfigs['stacked-area-chart']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={stackedAreaChartRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('streamgraph') && chartConfigs['streamgraph'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Streamgraph</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="streamgraph"
                                config={chartConfigs['streamgraph']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={streamgraphRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('box-plot') && chartConfigs['box-plot'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Box Plot</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="box-plot"
                                config={chartConfigs['box-plot']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={boxPlotRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('violin-plot') && chartConfigs['violin-plot'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Violin Plot</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="violin-plot"
                                config={chartConfigs['violin-plot']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={violinPlotRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('parallel-coordinates') && chartConfigs['parallel-coordinates'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Coordenadas Paralelas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="parallel-coordinates"
                                config={chartConfigs['parallel-coordinates']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={parallelCoordinatesRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('chord-diagram') && chartConfigs['chord-diagram'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Diagrama de Cordas</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="chord-diagram"
                                config={chartConfigs['chord-diagram']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={chordDiagramRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('sankey-diagram') && chartConfigs['sankey-diagram'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Diagrama de Sankey</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="sankey-diagram"
                                config={chartConfigs['sankey-diagram']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={sankeyDiagramRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('packed-circles') && chartConfigs['packed-circles'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Círculos Empacotados</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="packed-circles"
                                config={chartConfigs['packed-circles']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={packedCirclesRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('calendar-heatmap') && chartConfigs['calendar-heatmap'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Mapa de Calor de Calendário</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="calendar-heatmap"
                                config={chartConfigs['calendar-heatmap']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={calendarHeatmapRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('dendrogram') && chartConfigs['dendrogram'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Dendrograma</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="dendrogram"
                                config={chartConfigs['dendrogram']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={dendrogramRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
                {selectedDashboardType.includes('force-directed-graph') && chartConfigs['force-directed-graph'] && (
                    <div className="bg-gray-700 rounded-xl shadow-lg p-6 text-gray-100 flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Grafo de Força Dirigida</h3>
                        {csvData.length > 0 && Object.keys(csvData[0]).length > 0 && (
                            <ChartConfigurator
                                chartType="force-directed-graph"
                                config={chartConfigs['force-directed-graph']}
                                headers={Object.keys(csvData[0])}
                                onConfigChange={handleChartConfigChange}
                            />
                        )}
                        <div ref={forceDirectedGraphRef} className="w-full h-auto flex-grow"></div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex flex-col items-center">
            <h1 className="text-4xl font-bold mb-8 text-white">Dashboard de Dados CSV</h1>

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 w-full max-w-2xl">
                <label htmlFor="csv-upload" className="block text-lg font-medium text-gray-200 mb-4">
                    1. Faça o upload do seu arquivo CSV:
                </label>
                <input
                    type="file"
                    id="csv-upload"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-300
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-500 file:text-white
                                hover:file:bg-blue-600 cursor-pointer"
                />
                {errorMessage && <p className="text-red-400 mt-4">{errorMessage}</p>}
                {csvData.length > 0 && (
                    <p className="text-green-400 mt-4">CSV carregado com sucesso! ({csvData.length} linhas)</p>
                )}
            </div>

            {csvData.length > 0 && (
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 w-full max-w-2xl">
                    <h2 className="text-lg font-medium text-gray-200 mb-4">
                        2. Escolha os tipos de Dashboard:
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"> {/* Ajustado para mais colunas e gap menor */}
                        {/* Opção de Dashboard de Cards */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('cards') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('cards')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Cards"
                                alt="Miniatura de Dashboard de Cards"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Cards</p>
                        </div>

                        {/* Opção de Gráfico de Barras */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('bar-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('bar-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Barras"
                                alt="Miniatura de Gráfico de Barras Horizontal"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Barras</p>
                        </div>

                        {/* Opção de Treemap */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('treemap') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('treemap')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Treemap"
                                alt="Miniatura de Treemap"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Treemap</p>
                        </div>

                        {/* Nova opção de Gráfico de Barras Empilhadas */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('stacked-bar-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('stacked-bar-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Barras+Empilhadas"
                                alt="Miniatura de Gráfico de Barras Empilhadas"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Barras Empilhadas</p>
                        </div>

                        {/* Nova opção de Gráfico de Rosca */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('donut-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('donut-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Rosca"
                                alt="Miniatura de Gráfico de Rosca"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Rosca</p>
                        </div>

                        {/* Nova opção de Gráfico de Pizza */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('pie-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('pie-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Pizza"
                                alt="Miniatura de Gráfico de Pizza"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Pizza</p>
                        </div>

                        {/* Nova opção: Gráfico de Linhas */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('line-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('line-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Linhas"
                                alt="Miniatura de Gráfico de Linhas"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Linhas</p>
                        </div>

                        {/* Nova opção: Gráfico de Área */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('area-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('area-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Área"
                                alt="Miniatura de Gráfico de Área"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Área</p>
                        </div>

                        {/* Nova opção: Gráfico de Dispersão */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('scatter-plot') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('scatter-plot')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Dispersão"
                                alt="Miniatura de Gráfico de Dispersão"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Dispersão</p>
                        </div>

                        {/* Nova opção: Gráfico de Bolhas */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('bubble-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('bubble-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Bolhas"
                                alt="Miniatura de Gráfico de Bolhas"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Bolhas</p>
                        </div>

                        {/* Nova opção: Mapa de Calor */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('heatmap') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('heatmap')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Mapa+Calor"
                                alt="Miniatura de Mapa de Calor"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Mapa de Calor</p>
                        </div>

                        {/* Nova opção: Gráfico de Barras Radial */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('radial-bar-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('radial-bar-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Barras+Radiais"
                                alt="Miniatura de Gráfico de Barras Radial"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Barras Radiais</p>
                        </div>

                        {/* Nova opção: Gráfico de Medidor */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('gauge-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('gauge-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Medidor"
                                alt="Miniatura de Gráfico de Medidor"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Medidor</p>
                        </div>

                        {/* Nova opção: Gráfico de Área Empilhada */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('stacked-area-chart') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('stacked-area-chart')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Área+Empilhada"
                                alt="Miniatura de Gráfico de Área Empilhada"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Área Empilhada</p>
                        </div>

                        {/* Nova opção: Streamgraph */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('streamgraph') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('streamgraph')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Streamgraph"
                                alt="Miniatura de Streamgraph"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Streamgraph</p>
                        </div>

                        {/* Nova opção: Box Plot */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('box-plot') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('box-plot')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Box+Plot"
                                alt="Miniatura de Box Plot"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Box Plot</p>
                        </div>

                        {/* Nova opção: Violin Plot */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('violin-plot') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('violin-plot')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Violin+Plot"
                                alt="Miniatura de Violin Plot"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Violin Plot</p>
                        </div>

                        {/* Nova opção: Parallel Coordinates */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('parallel-coordinates') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('parallel-coordinates')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Coordenadas+Paralelas"
                                alt="Miniatura de Coordenadas Paralelas"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Coordenadas Paralelas</p>
                        </div>

                        {/* Nova opção: Chord Diagram */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('chord-diagram') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('chord-diagram')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Diagrama+Cordas"
                                alt="Miniatura de Diagrama de Cordas"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Diagrama de Cordas</p>
                        </div>

                        {/* Nova opção: Sankey Diagram */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('sankey-diagram') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('sankey-diagram')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Diagrama+Sankey"
                                alt="Miniatura de Diagrama de Sankey"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Diagrama de Sankey</p>
                        </div>

                        {/* Nova opção: Packed Circles */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('packed-circles') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('packed-circles')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Círculos+Empacotados"
                                alt="Miniatura de Círculos Empacotados"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Círculos Empacotados</p>
                        </div>

                        {/* Nova opção: Calendar Heatmap */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('calendar-heatmap') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('calendar-heatmap')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Mapa+Calor+Calendário"
                                alt="Miniatura de Mapa de Calor de Calendário"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Mapa de Calor de Calendário</p>
                        </div>

                        {/* Nova opção: Dendrogram */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('dendrogram') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('dendrogram')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Dendrograma"
                                alt="Miniatura de Dendrograma"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Dendrograma</p>
                        </div>

                        {/* Nova opção: Force-Directed Graph */}
                        <div
                            className={`p-2 rounded-lg cursor-pointer transition-all duration-200
                                        ${selectedDashboardType.includes('force-directed-graph') ? 'border-4 border-blue-500 ring-2 ring-blue-500' : 'border-2 border-gray-600 hover:border-blue-400'}`}
                            onClick={() => handleDashboardSelect('force-directed-graph')}
                        >
                            <img
                                src="https://placehold.co/150x80/2d3748/e2e8f0?text=Grafo+Força"
                                alt="Miniatura de Grafo de Força Dirigida"
                                className="w-full h-20 object-cover rounded-md mb-1"
                            />
                            <p className="text-center text-gray-200 text-sm">Grafo de Força Dirigida</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-4xl min-h-[300px] flex items-center justify-center">
                {/* 4. Renderiza o dashboard selecionado */}
                {renderDashboard()}
            </div>

            {/* Tooltip para D3.js, estilizado com Tailwind */}
            <div id="d3-tooltip" className="absolute opacity-0 bg-gray-900 text-white text-sm p-2 rounded-lg shadow-lg pointer-events-none transition-opacity duration-200 z-50"></div>

            <style>{`
                /* Estilos específicos para o tooltip do D3.js */
                #d3-tooltip {
                    position: absolute;
                    text-align: center;
                    padding: 8px;
                    font: 14px sans-serif;
                    background: #333;
                    color: #fff;
                    border: 0px;
                    border-radius: 8px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 1000;
                }
                /* Estilos para os eixos do D3.js */
                .axis text {
                    font-size: 12px;
                    fill: #a0aec0; /* Cor do texto dos eixos */
                }
                .axis line, .axis path {
                    stroke: #4a5568; /* Cor das linhas dos eixos */
                    shape-rendering: crispEdges;
                }
                .bar {
                    fill: #4299e1; /* Cor das barras (azul) */
                    transition: fill 0.3s ease;
                }
                .bar:hover {
                    fill: #3182ce; /* Cor mais escura ao passar o mouse */
                }
                .bar-label {
                    fill: white;
                }
                /* Estilos para o treemap */
                .treemap-text {
                    fill: white; /* Cor do texto no treemap */
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default App;
