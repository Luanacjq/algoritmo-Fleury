/* ============================================================
   Trabalho 03 — Algoritmo de Fleury (front interativo)
   ============================================================ */

// ---------- Dados do grafo do enunciado ----------
const VERTICES = [0, 1, 2, 3, 4, 5];
const ARESTAS = [[0, 1], [0, 3], [1, 5], [1, 2], [1, 4], [5, 2], [3, 2], [2, 4]];
const POS = {
  0: { x: 90, y: 70 }, 1: { x: 370, y: 70 }, 4: { x: 540, y: 200 },
  5: { x: 220, y: 200 }, 3: { x: 90, y: 330 }, 2: { x: 370, y: 330 },
};
const SVG_NS = "http://www.w3.org/2000/svg";

// Gera uma chave única para uma aresta não direcionada (ex.: 2-1 -> "1-2")
const chave = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

/* ============================================================
   Grafo + algoritmo de Fleury (mesma lógica do fleury.py)
   ============================================================ */
class Grafo {
  // Cria o grafo (lista de adjacência) a partir de uma lista de arestas
  constructor(arestas) {
    this.adj = new Map(VERTICES.map((v) => [v, []]));
    arestas.forEach(([u, v]) => this.adicionar(u, v));
  }

  // Adiciona a aresta u-v nos dois sentidos
  adicionar(u, v) {
    this.adj.get(u).push(v);
    this.adj.get(v).push(u);
  }

  // Remove a aresta u-v nos dois sentidos
  remover(u, v) {
    const a = this.adj.get(u), b = this.adj.get(v);
    a.splice(a.indexOf(v), 1);
    b.splice(b.indexOf(u), 1);
  }

  // Grau do vértice v (nº de arestas ainda disponíveis)
  grau(v) {
    return this.adj.get(v).length;
  }

  // Conta os vértices alcançáveis a partir de "inicio" (DFS iterativa)
  alcancaveis(inicio) {
    const vis = new Set([inicio]);
    const pilha = [inicio];
    while (pilha.length) {
      for (const w of this.adj.get(pilha.pop())) {
        if (!vis.has(w)) { vis.add(w); pilha.push(w); }
      }
    }
    return vis.size;
  }

  // Verifica se u-v é ponte: remove, conta alcançáveis e compara com o antes
  ehPonte(u, v) {
    const antes = this.alcancaveis(u);
    this.remover(u, v);
    const depois = this.alcancaveis(u);
    this.adicionar(u, v);
    return depois < antes;
  }

  // Regra de Fleury: aresta é válida se for a única saída ou se não for ponte
  arestaValida(u, v) {
    return this.grau(u) === 1 || !this.ehPonte(u, v);
  }
}

// Executa Fleury a partir de "inicio" e devolve cada passo com os candidatos avaliados
function executarFleury(inicio) {
  const g = new Grafo(ARESTAS);
  const passos = [];
  let u = inicio;
  while (g.grau(u) > 0) {
    const vizinhos = [...g.adj.get(u)].sort((a, b) => a - b);
    const unica = vizinhos.length === 1;
    const candidatos = vizinhos.map((v) => ({ v, ponte: g.ehPonte(u, v) }));
    const escolhido = candidatos.find((c) => unica || !c.ponte);
    passos.push({ de: u, para: escolhido.v, candidatos, unica });
    g.remover(u, escolhido.v);
    u = escolhido.v;
  }
  return passos;
}

/* ============================================================
   Estado da interface
   ============================================================ */
const estado = {
  modo: "auto",       // "auto" (animação) ou "desafio" (usuário joga)
  inicio: 0,          // vértice inicial escolhido
  passos: [],         // passos pré-calculados pelo Fleury
  k: 0,               // quantos passos já foram aplicados na animação
  tocando: false,     // animação automática ligada?
  animando: false,    // há um movimento em andamento?
  geracao: 0,         // incrementa para cancelar animações antigas
  velocidade: 1,
  grafoDesafio: null, // grafo restante no modo desafio
  trilhaDesafio: [],  // arestas escolhidas pelo usuário
  pontesTentadas: 0,
};

const $ = (s) => document.querySelector(s);
const el = {
  viajante: $("#viajante"), explicacao: $("#explicacao"), tour: $("#tour"), log: $("#log"),
  graus: $("#graus"), contador: $("#contador"), progresso: $("#barra-progresso"),
  banner: $("#banner-fim"), bannerTitulo: $("#banner-titulo"), bannerTexto: $("#banner-texto"),
  play: $("#btn-play"), voltar: $("#btn-voltar"), proximo: $("#btn-proximo"),
  desfazer: $("#btn-desfazer"), seletor: $("#seletor-inicio"),
};
const elsAresta = {};  // chave -> elementos SVG da aresta
const elsVertice = {}; // vértice -> elementos SVG do vértice
const elsGrau = {};    // vértice -> barra de grau
const GRAU_ORIGINAL = Object.fromEntries(VERTICES.map((v) => [v, new Grafo(ARESTAS).grau(v)]));

/* ============================================================
   Utilitários
   ============================================================ */

// Cria um elemento SVG com atributos
function criar(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Duração base de uma animação, ajustada pela velocidade
const duracao = () => 950 / estado.velocidade;

// Curva de suavização (acelera e desacelera)
const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Cor de cada passo: degradê do roxo ao ciano conforme a ordem
const corDoPasso = (i) => `hsl(${265 - i * (85 / (ARESTAS.length - 1))}, 90%, 66%)`;

// Espera "ms" milissegundos; retorna false se a animação foi cancelada nesse meio-tempo
function esperar(ms, gen) {
  return new Promise((r) => setTimeout(() => r(gen === estado.geracao), ms));
}

// Cancela qualquer animação em andamento
function cancelarAnimacoes() {
  estado.geracao++;
  estado.tocando = false;
  estado.animando = false;
  el.viajante.classList.remove("visivel");
}

// Mostra uma notificação temporária no rodapé
function toast(msg, tipo = "") {
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.innerHTML = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.classList.add("saindo"); setTimeout(() => t.remove(), 300); }, 3200);
}

// Solta confetes coloridos pela tela
function confete() {
  const cores = ["#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#ec4899", "#ffffff"];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("span");
    c.className = "confete";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = cores[i % cores.length];
    c.style.animationDuration = `${2 + Math.random() * 2}s`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.setProperty("--giro", `${Math.random() * 900 - 450}deg`);
    c.style.setProperty("--desvio", `${Math.random() * 240 - 120}px`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4800);
  }
}

/* ============================================================
   Montagem inicial do SVG e dos painéis
   ============================================================ */

// Desenha arestas, rótulos numéricos e vértices no SVG
function montarSVG() {
  const gA = $("#camada-arestas"), gL = $("#camada-rotulos"), gV = $("#camada-vertices");

  ARESTAS.forEach(([u, v]) => {
    const a = POS[u], b = POS[v], k = chave(u, v);
    const coords = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    const base = criar("line", { ...coords, class: "aresta-base" });
    const halo = criar("line", { ...coords, class: "aresta-halo" });
    const trilha = criar("line", { ...coords, class: "aresta-trilha" });
    const hit = criar("line", { ...coords, class: "aresta-hit" });
    hit.addEventListener("click", () => cliqueAresta(u, v));
    gA.append(base, halo, trilha, hit);

    const rotulo = criar("g", { class: "rotulo", transform: `translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2})` });
    const inner = criar("g", { class: "rotulo-inner" });
    const circ = criar("circle", { r: 13 });
    const txt = criar("text", { dy: "0.35em" });
    inner.append(circ, txt);
    rotulo.append(inner);
    gL.append(rotulo);

    elsAresta[k] = { base, linhas: [halo, trilha], rotulo, circ, txt };
  });

  VERTICES.forEach((v) => {
    const g = criar("g", { class: "vertice", transform: `translate(${POS[v].x},${POS[v].y})` });
    const inner = criar("g", { class: "vertice-inner" });
    const pulso = criar("circle", { r: 28, class: "pulso" });
    const circ = criar("circle", { r: 28, class: "vertice-circulo" });
    const txt = criar("text", { class: "vertice-txt", dy: "0.35em" });
    txt.textContent = v;
    const badge = criar("g", { class: "badge", transform: "translate(22,-22)" });
    const bTxt = criar("text", { dy: "0.35em" });
    badge.append(criar("circle", { r: 11 }), bTxt);
    inner.append(pulso, circ, txt, badge);
    g.append(inner);
    g.addEventListener("click", () => cliqueVertice(v));
    gV.append(g);
    elsVertice[v] = { g, bTxt };
  });
}

// Cria as barras de grau e os botões de vértice inicial
function montarPaineis() {
  VERTICES.forEach((v) => {
    const linha = document.createElement("div");
    linha.className = "grau-linha";
    linha.innerHTML = `<span class="grau-v">${v}</span><div class="grau-barra"><div></div></div><span class="grau-num"></span>`;
    el.graus.appendChild(linha);
    elsGrau[v] = { barra: linha.querySelector(".grau-barra div"), num: linha.querySelector(".grau-num") };

    const b = document.createElement("button");
    b.className = "chip-inicio";
    b.textContent = v;
    b.addEventListener("click", () => definirInicio(v));
    el.seletor.appendChild(b);
  });
  const todosPares = VERTICES.every((v) => GRAU_ORIGINAL[v] % 2 === 0);
  const info = document.createElement("p");
  info.className = "grau-info";
  info.textContent = todosPares
    ? "✓ Todos os graus são pares → existe um circuito de Euler."
    : "Há vértices de grau ímpar → caminho de Euler.";
  el.graus.appendChild(info);
}

/* ============================================================
   Renderização (compartilhada pelos dois modos)
   ============================================================ */

// Posiciona a linha colorida (e seu halo) de uma aresta na direção de→para, escondida e pronta p/ animar
function prepararTrilha(e, de, para, indice) {
  const a = POS[de], b = POS[para];
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const cor = corDoPasso(indice);
  e.linhas.forEach((t, i) => {
    Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }).forEach(([k, v]) => t.setAttribute(k, v));
    t.style.transition = "none";
    t.style.strokeDasharray = L;
    t.style.strokeDashoffset = L;
    t.style.stroke = cor;
    t.style.opacity = i === 0 ? 0.22 : 1; // halo fica translúcido
  });
  e.txt.textContent = indice + 1;
  e.circ.style.stroke = cor;
}

// Desenha o grafo de acordo com a trilha já percorrida e o vértice atual
function renderizarGrafo(trilha, atual) {
  const usadas = new Map(trilha.map((p, i) => [chave(p.de, p.para), { ...p, i }]));

  for (const [k, e] of Object.entries(elsAresta)) {
    e.base.classList.remove("candidata", "ponte", "disponivel", "dica");
    const p = usadas.get(k);
    if (p) {
      prepararTrilha(e, p.de, p.para, p.i);
      e.linhas.forEach((t) => (t.style.strokeDashoffset = 0));
      e.base.classList.add("usada");
      e.rotulo.classList.add("visivel");
    } else {
      e.linhas.forEach((t) => { t.style.transition = "none"; t.style.opacity = 0; });
      e.base.classList.remove("usada");
      e.rotulo.classList.remove("visivel");
    }
  }

  VERTICES.forEach((v) => {
    const usadasDoV = trilha.filter((p) => p.de === v || p.para === v).length;
    const restante = GRAU_ORIGINAL[v] - usadasDoV;
    const { g, bTxt } = elsVertice[v];
    bTxt.textContent = restante;
    g.classList.toggle("atual", v === atual);
    g.classList.toggle("esgotado", restante === 0);
    elsGrau[v].barra.style.width = `${(restante / GRAU_ORIGINAL[v]) * 100}%`;
    elsGrau[v].num.textContent = `${restante}/${GRAU_ORIGINAL[v]}`;
  });
}

// Atualiza tour, barra de progresso e histórico
function renderizarPaineis(trilha, notas, animarUltimo) {
  const seq = [estado.inicio, ...trilha.map((p) => p.para)];
  el.tour.innerHTML = seq.map((v, i) => {
    const ultimo = i === seq.length - 1;
    const cls = `no${ultimo ? " ultimo" : ""}${ultimo && animarUltimo && i > 0 ? " novo" : ""}`;
    const cor = i ? corDoPasso(i - 1) : "rgba(255,255,255,.4)";
    return `${i ? '<span class="seta">→</span>' : ""}<span class="${cls}" style="--cor:${cor}">${v}</span>`;
  }).join("");

  el.progresso.style.width = `${(trilha.length / ARESTAS.length) * 100}%`;
  el.contador.textContent = `${trilha.length}/${ARESTAS.length} arestas`;

  el.log.innerHTML = trilha.length
    ? trilha.map((p, i) => {
        const novo = animarUltimo && i === trilha.length - 1 ? "novo" : "";
        const nota = notas[i] ? `<small class="${notas[i].cls || ""}">${notas[i].txt}</small>` : "";
        return `<li class="${novo}"><span class="log-num" style="--cor:${corDoPasso(i)}">${i + 1}</span><b>${p.de} → ${p.para}</b>${nota}</li>`;
      }).join("")
    : '<li class="vazio">Nenhuma aresta percorrida ainda.</li>';
  el.log.scrollTop = el.log.scrollHeight;
}

// Anima a bolinha viajando de "de" até "para" enquanto a aresta é pintada
function animarMovimento(de, para, indice, gen) {
  return new Promise((resolve) => {
    const e = elsAresta[chave(de, para)], dur = duracao();
    const a = POS[de], b = POS[para];
    prepararTrilha(e, de, para, indice);
    void e.linhas[1].getBoundingClientRect(); // força o navegador a aplicar o estado inicial
    e.linhas.forEach((t) => {
      t.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.65,0,.35,1)`;
      t.style.strokeDashoffset = 0;
    });
    elsVertice[de].g.classList.remove("atual");
    el.viajante.classList.add("visivel");

    const t0 = performance.now();
    const quadro = (agora) => {
      if (gen !== estado.geracao) return resolve(false);
      const p = Math.min(1, (agora - t0) / dur), s = suavizar(p);
      el.viajante.setAttribute("transform", `translate(${a.x + (b.x - a.x) * s},${a.y + (b.y - a.y) * s})`);
      if (p < 1) return requestAnimationFrame(quadro);
      el.viajante.classList.remove("visivel");
      e.rotulo.classList.add("visivel");
      resolve(true);
    };
    requestAnimationFrame(quadro);
  });
}

// Mostra/esconde o banner de conclusão
function mostrarBanner(visivel, titulo = "", texto = "") {
  el.banner.classList.toggle("visivel", visivel);
  if (visivel) { el.bannerTitulo.textContent = titulo; el.bannerTexto.textContent = texto; }
}

// Chamado quando todas as arestas foram percorridas
function concluir(trilha) {
  const seq = [estado.inicio, ...trilha.map((p) => p.para)].join(" → ");
  const extra = estado.modo === "desafio" && estado.pontesTentadas
    ? ` · ${estado.pontesTentadas} ponte(s) bloqueada(s)` : "";
  mostrarBanner(true, "Circuito de Euler encontrado!", seq + extra);
  confete();
}

/* ============================================================
   Modo animação (automático)
   ============================================================ */

// Monta o HTML que explica a decisão tomada em um passo
function htmlExplicacao(p, idx) {
  const itens = p.candidatos.map((c) => {
    let cls = "neutro", tag = "não é ponte";
    if (c.v === p.para) { cls = "ok"; tag = p.unica ? (c.ponte ? "ponte, mas é a única" : "única opção") : "não é ponte ✓"; }
    else if (c.ponte) { cls = "erro"; tag = "ponte ✗ evitada"; }
    return `<li class="cand ${cls}"><span class="aresta-tag">${p.de}–${c.v}</span><span class="tag">${tag}</span></li>`;
  }).join("");

  const evitadas = p.candidatos.filter((c) => c.ponte && c.v !== p.para).map((c) => `${p.de}–${c.v}`);
  let texto;
  if (evitadas.length) texto = `A aresta <b>${evitadas.join(", ")}</b> é uma <b>ponte</b>: usá-la agora deixaria parte do grafo inalcançável. Fleury escolhe outra.`;
  else if (p.unica) texto = `Só resta <b>uma aresta</b> saindo do vértice ${p.de}, então ela é usada obrigatoriamente.`;
  else texto = "Nenhuma aresta disponível é ponte, então qualquer uma serve — escolhemos a de menor rótulo.";

  return `<div class="exp-topo"><span class="exp-num">Passo ${idx + 1} de ${estado.passos.length}</span><span>Vértice atual: <b>${p.de}</b></span></div>
    <ul class="cands">${itens}</ul>
    <p>${texto}</p>
    <div class="exp-escolha">Escolhida: <b>${p.de} → ${p.para}</b></div>`;
}

// Gera as notas do histórico (pontes evitadas / única saída)
function notasAuto() {
  return estado.passos.map((p) => {
    const ev = p.candidatos.filter((c) => c.ponte && c.v !== p.para);
    if (ev.length) return { txt: `evitou a ponte ${ev.map((c) => `${p.de}–${c.v}`).join(", ")}`, cls: "" };
    if (p.unica) return { txt: "única saída", cls: "info" };
    return null;
  });
}

// Redesenha tudo do modo animação conforme o passo atual (k)
function renderizarAuto(animarUltimo = false) {
  const { passos, k } = estado;
  const trilha = passos.slice(0, k);
  const atual = k === 0 ? estado.inicio : passos[k - 1].para;
  renderizarGrafo(trilha, atual);
  renderizarPaineis(trilha, notasAuto(), animarUltimo);

  if (k === 0) {
    el.explicacao.innerHTML = `<p>Começando no vértice <b>${estado.inicio}</b>. Como todos os vértices têm grau par,
      o tour termina onde começou (<b>circuito de Euler</b>).</p>
      <p style="margin-top:8px">Aperte <b>▶</b> para assistir ou <b>⏭</b> para avançar um passo.</p>`;
  } else if (k === passos.length) {
    el.explicacao.innerHTML = htmlExplicacao(passos[k - 1], k - 1) +
      `<p class="exp-ok" style="margin-top:10px">✓ Todas as ${ARESTAS.length} arestas foram percorridas exatamente uma vez.</p>`;
  } else {
    el.explicacao.innerHTML = htmlExplicacao(passos[k - 1], k - 1);
  }
  if (k < passos.length) mostrarBanner(false);
  atualizarBotoes();
}

// Destaca no grafo as arestas candidatas (verde) e as pontes evitadas (vermelho)
function destacarCandidatos(p) {
  p.candidatos.forEach((c) => {
    const base = elsAresta[chave(p.de, c.v)].base;
    base.classList.add(c.v === p.para ? "candidata" : c.ponte ? "ponte" : "disponivel");
  });
}

// Avança um passo: mostra a decisão, depois anima o movimento
async function passoFrente() {
  if (estado.animando || estado.k >= estado.passos.length) return false;
  const gen = estado.geracao;
  estado.animando = true;
  atualizarBotoes();

  const p = estado.passos[estado.k];
  el.explicacao.innerHTML = htmlExplicacao(p, estado.k);
  destacarCandidatos(p);
  if (!(await esperar(duracao() * 0.9, gen))) return false;
  Object.values(elsAresta).forEach((e) => e.base.classList.remove("candidata", "ponte", "disponivel"));
  if (!(await animarMovimento(p.de, p.para, estado.k, gen))) return false;

  estado.k++;
  estado.animando = false;
  renderizarAuto(true);
  if (estado.k === estado.passos.length) concluir(estado.passos);
  return true;
}

// Liga/desliga a reprodução automática
async function alternarPlay() {
  if (estado.tocando) { estado.tocando = false; atualizarBotoes(); return; }
  if (estado.k >= estado.passos.length) reiniciarAuto();
  estado.tocando = true;
  atualizarBotoes();
  const gen = estado.geracao;
  while (estado.tocando && gen === estado.geracao && estado.k < estado.passos.length) {
    if (!(await passoFrente())) break;
    await esperar(duracao() * 0.3, gen);
  }
  if (gen === estado.geracao) { estado.tocando = false; atualizarBotoes(); }
}

// Volta um passo (ou cancela o passo que está sendo animado)
function passoTras() {
  const estavaAnimando = estado.animando;
  cancelarAnimacoes();
  if (!estavaAnimando && estado.k > 0) estado.k--;
  renderizarAuto();
}

// Volta a animação para o início
function reiniciarAuto() {
  cancelarAnimacoes();
  estado.k = 0;
  mostrarBanner(false);
  renderizarAuto();
}

// Habilita/desabilita botões conforme o estado
function atualizarBotoes() {
  const fim = estado.k >= estado.passos.length;
  el.play.textContent = estado.tocando ? "❚❚" : fim ? "⟲" : "▶";
  el.voltar.disabled = estado.k === 0 && !estado.animando;
  el.proximo.disabled = fim || estado.animando;
  el.desfazer.disabled = estado.trilhaDesafio.length === 0;
}

/* ============================================================
   Modo desafio (o usuário monta o tour clicando nas arestas)
   ============================================================ */

// Vértice onde o usuário está no modo desafio
const atualDesafio = () => {
  const t = estado.trilhaDesafio;
  return t.length ? t[t.length - 1].para : estado.inicio;
};

// Redesenha o modo desafio e marca as arestas que saem do vértice atual
function renderizarDesafio(animarUltimo = false) {
  const trilha = estado.trilhaDesafio, atual = atualDesafio();
  renderizarGrafo(trilha, atual);
  renderizarPaineis(trilha, [], animarUltimo);
  estado.grafoDesafio.adj.get(atual).forEach((v) => elsAresta[chave(atual, v)].base.classList.add("disponivel"));

  const saidas = estado.grafoDesafio.grau(atual);
  el.explicacao.innerHTML = trilha.length === ARESTAS.length
    ? `<p class="exp-ok">✓ Parabéns! Você construiu um Tour de Euler respeitando a regra de Fleury.</p>`
    : `<div class="exp-topo"><span class="exp-num">Sua vez</span><span>Vértice atual: <b>${atual}</b></span></div>
       <p>Clique em uma das <b>${saidas}</b> aresta(s) roxa(s) que saem do vértice <b>${atual}</b>.</p>
       <p style="margin-top:8px">Regra: <b>não atravesse uma ponte</b> se existir outra opção — senão você fica preso
       sem conseguir voltar às arestas que sobraram.</p>`;
  if (trilha.length < ARESTAS.length) mostrarBanner(false);
  atualizarBotoes();
}

// Faz a aresta tremer (feedback de jogada inválida)
function tremer(k, ponte = false) {
  const base = elsAresta[k].base;
  base.classList.remove("tremer");
  void base.getBoundingClientRect();
  base.classList.add("tremer");
  if (ponte) base.classList.add("ponte");
  setTimeout(() => base.classList.remove("tremer", "ponte"), 900);
}

// Trata o clique em uma aresta no modo desafio
async function cliqueAresta(u, v) {
  if (estado.modo !== "desafio" || estado.animando) return;
  const k = chave(u, v), g = estado.grafoDesafio, atual = atualDesafio();

  if (estado.trilhaDesafio.some((p) => chave(p.de, p.para) === k))
    return toast("Essa aresta já foi percorrida.", "aviso");
  if (u !== atual && v !== atual) {
    tremer(k);
    return toast(`A aresta <b>${u}–${v}</b> não sai do vértice atual (<b>${atual}</b>).`, "aviso");
  }
  const outro = u === atual ? v : u;
  if (!g.arestaValida(atual, outro)) {
    tremer(k, true);
    estado.pontesTentadas++;
    return toast(`🚫 <b>${atual}–${outro}</b> é uma <b>ponte</b>! Se você passar por ela agora, não conseguirá voltar para as outras arestas.`, "erro");
  }

  const gen = estado.geracao;
  estado.animando = true;
  Object.values(elsAresta).forEach((e) => e.base.classList.remove("disponivel", "dica"));
  if (!(await animarMovimento(atual, outro, estado.trilhaDesafio.length, gen))) return;
  g.remover(atual, outro);
  estado.trilhaDesafio.push({ de: atual, para: outro });
  estado.animando = false;
  renderizarDesafio(true);
  if (estado.trilhaDesafio.length === ARESTAS.length) concluir(estado.trilhaDesafio);
}

// Destaca em verde as arestas seguras a partir do vértice atual
function dica() {
  if (estado.animando) return;
  const atual = atualDesafio(), g = estado.grafoDesafio;
  const seguras = [...g.adj.get(atual)].filter((v) => g.arestaValida(atual, v));
  if (!seguras.length) return;
  seguras.forEach((v) => elsAresta[chave(atual, v)].base.classList.add("dica"));
  setTimeout(() => seguras.forEach((v) => elsAresta[chave(atual, v)].base.classList.remove("dica")), 1800);
  toast(`💡 Arestas seguras a partir de ${atual}: <b>${seguras.map((v) => `${atual}–${v}`).join(", ")}</b>`, "ok");
}

// Desfaz a última aresta escolhida no desafio
function desfazer() {
  if (estado.animando || !estado.trilhaDesafio.length) return;
  const p = estado.trilhaDesafio.pop();
  estado.grafoDesafio.adicionar(p.de, p.para);
  renderizarDesafio();
}

// Recomeça o desafio do zero
function reiniciarDesafio() {
  cancelarAnimacoes();
  estado.grafoDesafio = new Grafo(ARESTAS);
  estado.trilhaDesafio = [];
  estado.pontesTentadas = 0;
  mostrarBanner(false);
  renderizarDesafio();
}

/* ============================================================
   Ações gerais
   ============================================================ */

// Troca o vértice inicial e recalcula o Fleury
function definirInicio(v) {
  estado.inicio = v;
  estado.passos = executarFleury(v);
  [...el.seletor.children].forEach((b, i) => b.classList.toggle("ativo", VERTICES[i] === v));
  estado.modo === "auto" ? reiniciarAuto() : reiniciarDesafio();
}

// Clique num vértice: troca o início se o tour ainda não começou
function cliqueVertice(v) {
  const comecou = estado.modo === "auto" ? estado.k > 0 || estado.animando : estado.trilhaDesafio.length > 0;
  if (!comecou) definirInicio(v);
  else if (estado.modo === "desafio") toast("Clique nas <b>arestas</b> para andar pelo grafo.", "aviso");
}

// Alterna entre modo animação e modo desafio
function trocarModo(modo) {
  estado.modo = modo;
  document.body.className = `modo-${modo}`;
  document.querySelectorAll(".aba").forEach((a) => a.classList.toggle("ativa", a.dataset.modo === modo));
  $("#controles-auto").classList.toggle("oculto", modo !== "auto");
  $("#controles-desafio").classList.toggle("oculto", modo !== "desafio");
  moverIndicador();
  modo === "auto" ? reiniciarAuto() : reiniciarDesafio();
}

// Move o fundo roxo das abas para a aba ativa
function moverIndicador() {
  const ativa = $(".aba.ativa"), ind = $(".aba-indicador");
  ind.style.width = `${ativa.offsetWidth}px`;
  ind.style.transform = `translateX(${ativa.offsetLeft - 4}px)`;
}

// Liga todos os eventos de botões, slider e teclado
function ligarEventos() {
  el.play.addEventListener("click", alternarPlay);
  el.proximo.addEventListener("click", passoFrente);
  el.voltar.addEventListener("click", passoTras);
  $("#btn-reiniciar").addEventListener("click", reiniciarAuto);
  $("#btn-des-reiniciar").addEventListener("click", reiniciarDesafio);
  $("#btn-dica").addEventListener("click", dica);
  el.desfazer.addEventListener("click", desfazer);
  document.querySelectorAll(".aba").forEach((a) => a.addEventListener("click", () => trocarModo(a.dataset.modo)));
  $("#vel").addEventListener("input", (e) => {
    estado.velocidade = Number(e.target.value);
    $("#vel-valor").textContent = `${estado.velocidade.toFixed(2).replace(/0$/, "")}×`;
  });
  window.addEventListener("resize", moverIndicador);
  document.addEventListener("keydown", (e) => {
    if (estado.modo !== "auto" || e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); alternarPlay(); }
    else if (e.key === "ArrowRight") passoFrente();
    else if (e.key === "ArrowLeft") passoTras();
    else if (e.key.toLowerCase() === "r") reiniciarAuto();
  });
}

// Ponto de entrada
function iniciar() {
  montarSVG();
  montarPaineis();
  ligarEventos();
  estado.grafoDesafio = new Grafo(ARESTAS);
  definirInicio(0);
  moverIndicador();
  document.fonts?.ready.then(moverIndicador);
}

iniciar();
