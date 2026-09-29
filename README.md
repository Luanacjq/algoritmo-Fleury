# Algoritmo de Fleury — Tour de Euler

**Trabalho 03 · Teoria dos Grafos** — implementação do algoritmo de Fleury para construir o Tour de Euler no grafo do enunciado, com uma interface web interativa e animada.

## O grafo do trabalho

```
    0 ─────── 1
    │       ╱ │ ╲
    │     5   │   4
    │       ╲ │ ╱
    3 ─────── 2
```

| Vértice | Vizinhos | Grau |
|:-:|:-:|:-:|
| 0 | 1, 3 | 2 |
| 1 | 0, 2, 4, 5 | 4 |
| 2 | 1, 3, 4, 5 | 4 |
| 3 | 0, 2 | 2 |
| 4 | 1, 2 | 2 |
| 5 | 1, 2 | 2 |

São 6 vértices e 8 arestas: `0-1, 0-3, 1-5, 1-2, 1-4, 5-2, 3-2, 2-4`.

## Conceitos

- **Tour (circuito) de Euler**: passeio que usa **todas as arestas exatamente uma vez** e termina no vértice onde começou.
- **Quando ele existe** (teorema de Euler): o grafo precisa ser conexo e **todos os vértices precisam ter grau par**. Se exatamente dois vértices tiverem grau ímpar, existe apenas um *caminho* de Euler, que começa em um ímpar e termina no outro.
- **Ponte**: aresta que, se removida, desconecta o grafo, ou seja, deixa parte dele inalcançável.

No nosso grafo todos os graus são pares (2, 4, 4, 2, 2, 2) e ele é conexo, então **existe um circuito de Euler**.

## O que é uma ponte?

Uma **ponte** é uma aresta que é a **única ligação** entre duas partes do grafo. Se ela for removida, o grafo se divide em pedaços que não se alcançam mais. É como uma ponte de verdade sobre um rio: se ela cair, não dá mais para ir de uma margem à outra.

**Exemplo no nosso grafo:** depois de percorrer `0 → 1 → 2`, sobram as arestas `1-4, 1-5, 2-3, 2-4, 2-5, 3-0`. Nesse momento, **`2-3` é uma ponte**: o trecho `3 – 0` só se liga ao resto do grafo por ela.

```
  Arestas que sobraram depois de 0 → 1 → 2:

    0            1
    │          ╱   ╲
    │        5       4
    │          ╲   ╱
    3 ══════════ 2       ══  ponte (2-3)
```

Se o algoritmo fosse de `2` para `3`, depois seguiria para `0` e ficaria **preso** lá, sem nenhuma aresta de saída, deixando `2-4`, `4-1`, `1-5` e `5-2` sem percorrer. Por isso Fleury escolhe `2 → 4` e deixa a ponte para o final, quando ela passa a ser a única opção.

**Como o programa detecta uma ponte:**
1. Conta quantos vértices dá para alcançar a partir de `u` (busca em profundidade, DFS).
2. Remove temporariamente a aresta `u-v`.
3. Conta de novo.
4. Se o número **diminuiu**, `u-v` é ponte. Depois disso a aresta é recolocada no grafo.

> **Regra de ouro de Fleury:** só atravesse uma ponte quando ela for a única aresta que sai do vértice atual.

## Como funciona o algoritmo de Fleury

A ideia é andar pelo grafo apagando as arestas por onde passamos, **sem nunca atravessar uma ponte se houver outra opção**. Quem "queima a ponte" cedo demais fica preso de um lado do grafo e deixa arestas sem percorrer do outro.

1. Verifica se o grafo é conexo e conta os vértices de grau ímpar para escolher o início (qualquer vértice se forem 0 ímpares; um ímpar se forem 2).
2. No vértice atual `u`, olha cada aresta `u-v` ainda disponível.
3. Uma aresta é **válida** se for a única que sai de `u` **ou** se **não for ponte**.
4. Para saber se `u-v` é ponte: conta, com uma DFS, quantos vértices são alcançáveis a partir de `u`; remove a aresta; conta de novo. Se o número caiu, é ponte. Depois a aresta é restaurada.
5. Percorre a primeira aresta válida, remove-a do grafo e repete a partir de `v` até não sobrar nenhuma aresta.

```
u ← vértice inicial
enquanto grau(u) > 0:
    para cada vizinho v de u:
        se (u,v) é a única aresta de u  ou  (u,v) não é ponte:
            adiciona (u,v) ao tour
            remove (u,v) do grafo
            u ← v
            pare
```

**Complexidade:** cada uma das E arestas pode exigir um teste de ponte de custo O(V + E), então o total é **O(E · (V + E))**, ou O(E²) em grafos conexos. É mais lento que o algoritmo de Hierholzer (O(E)), mas é bem mais intuitivo.

## Resultado

Começando pelo vértice 0 (vizinhos sempre testados em ordem crescente):

| Passo | Aresta | Observação |
|:-:|:-:|---|
| 1 | 0 → 1 | nenhuma opção é ponte |
| 2 | 1 → 2 | nenhuma opção é ponte |
| 3 | 2 → 4 | **2–3 é ponte** (levaria ao "beco" 3–0), então é evitada |
| 4 | 4 → 1 | única saída |
| 5 | 1 → 5 | única saída |
| 6 | 5 → 2 | única saída |
| 7 | 2 → 3 | única saída |
| 8 | 3 → 0 | única saída |

**Tour de Euler:** `0 → 1 → 2 → 4 → 1 → 5 → 2 → 3 → 0`

Todas as 8 arestas foram usadas uma única vez e o passeio voltou ao vértice 0.

## Estrutura do projeto

```
algoritmo-Fleury/
├── fleury.py        # Implementação do algoritmo (Python, saída no terminal)
└── web/
    ├── index.html   # Interface interativa
    ├── estudo.html  # Guia de estudo (teoria, código explicado, perguntas e quiz)
    ├── style.css    # Visual e animações
    └── script.js    # Fleury em JavaScript + lógica da interface
```

Todas as funções dos dois códigos têm um comentário curto dizendo o que fazem.

## Como executar

### Versão em Python

```bash
python fleury.py
```

Mostra o grau de cada vértice, as arestas na ordem em que foram percorridas e o tour final.

### Interface web

Abra o arquivo `web/index.html` no navegador (é só dar dois cliques; não precisa de servidor nem de instalar nada).

**Modo Animação**
- ▶ reproduz o algoritmo passo a passo: uma bolinha percorre cada aresta, que vai sendo pintada e numerada na ordem do tour.
- Antes de cada movimento, as arestas candidatas aparecem em **verde** e as pontes evitadas em **vermelho tracejado**, e o painel "Passo atual" explica a decisão.
- Dá para avançar e voltar um passo por vez, reiniciar e ajustar a velocidade.
- Os painéis mostram o tour sendo formado, os graus restantes de cada vértice e o histórico dos passos.
- O vértice inicial pode ser trocado (0 a 5) para ver outros tours válidos.

**Modo Desafio**
- Você monta o tour clicando nas arestas.
- Se tentar atravessar uma ponte quando existe outra saída, a aresta treme e aparece um aviso explicando o motivo.
- Tem os botões 💡 Dica (mostra as arestas seguras) e ↶ Desfazer.

**Atalhos:** `Espaço` tocar/pausar · `←` `→` voltar/avançar · `R` reiniciar
