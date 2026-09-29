r"""
Trabalho 03 - Algoritmo de Fleury
Constrói o Tour (circuito) de Euler no grafo do enunciado:

        0 ------- 1
        |       / | \
        |     5   |   4
        |       \ | /
        3 ------- 2

Arestas: 0-1, 0-3, 1-5, 1-2, 1-4, 5-2, 3-2, 2-4
"""

from collections import defaultdict


class Grafo:
    """Grafo não direcionado representado por lista de adjacência."""

    def __init__(self, arestas):
        """Cria o grafo a partir de uma lista de arestas (u, v)."""
        self.adj = defaultdict(list)
        for u, v in arestas:
            self.adicionar_aresta(u, v)

    def adicionar_aresta(self, u, v):
        """Adiciona a aresta u-v nos dois sentidos (grafo não direcionado)."""
        self.adj[u].append(v)
        self.adj[v].append(u)

    def remover_aresta(self, u, v):
        """Remove a aresta u-v nos dois sentidos."""
        self.adj[u].remove(v)
        self.adj[v].remove(u)

    def grau(self, v):
        """Retorna o grau do vértice v (quantidade de arestas ligadas a ele)."""
        return len(self.adj[v])

    def contar_alcancaveis(self, inicio):
        """Conta quantos vértices são alcançáveis a partir de 'inicio' (DFS iterativa)."""
        visitados = {inicio}
        pilha = [inicio]
        while pilha:
            atual = pilha.pop()
            for vizinho in self.adj[atual]:
                if vizinho not in visitados:
                    visitados.add(vizinho)
                    pilha.append(vizinho)
        return len(visitados)

    def eh_ponte(self, u, v):
        """
        Verifica se a aresta u-v é uma ponte (se removê-la desconecta o grafo).
        Compara o nº de vértices alcançáveis a partir de u antes e depois de removê-la.
        """
        antes = self.contar_alcancaveis(u)
        self.remover_aresta(u, v)
        depois = self.contar_alcancaveis(u)
        self.adicionar_aresta(u, v)  # restaura a aresta
        return depois < antes

    def aresta_valida(self, u, v):
        """
        Regra de Fleury: a aresta u-v pode ser usada se
        (1) for a única aresta saindo de u, ou
        (2) não for uma ponte.
        """
        if self.grau(u) == 1:
            return True
        return not self.eh_ponte(u, v)

    def eh_conexo(self):
        """Verifica se todos os vértices com arestas estão na mesma componente."""
        com_arestas = [v for v in self.adj if self.grau(v) > 0]
        if not com_arestas:
            return True
        return self.contar_alcancaveis(com_arestas[0]) == len(com_arestas)

    def vertice_inicial(self):
        """
        Escolhe onde começar:
        - 0 ímpares  -> circuito de Euler (começa em qualquer vértice)
        - 2 ímpares  -> caminho de Euler (começa em um vértice ímpar)
        - outro caso -> não existe tour de Euler (retorna None)
        """
        impares = [v for v in sorted(self.adj) if self.grau(v) % 2 == 1]
        if len(impares) == 0:
            return min(self.adj)
        if len(impares) == 2:
            return impares[0]
        return None

    def fleury(self):
        """
        Executa o algoritmo de Fleury e retorna a lista de arestas do tour.
        A cada passo, escolhe uma aresta que não seja ponte (a menos que não haja
        outra opção), percorre-a e a remove do grafo.
        """
        if not self.eh_conexo():
            return None
        u = self.vertice_inicial()
        if u is None:
            return None

        tour = []
        while self.grau(u) > 0:
            for v in sorted(self.adj[u]):  # ordena para resultado determinístico
                if self.aresta_valida(u, v):
                    tour.append((u, v))
                    self.remover_aresta(u, v)
                    u = v
                    break
        return tour


def main():
    """Monta o grafo do enunciado, executa Fleury e imprime o resultado."""
    arestas = [(0, 1), (0, 3), (1, 5), (1, 2), (1, 4), (5, 2), (3, 2), (2, 4)]
    grafo = Grafo(arestas)

    print("Graus dos vértices:")
    for v in sorted(grafo.adj):
        print(f"  grau({v}) = {grafo.grau(v)}")

    tour = grafo.fleury()
    if tour is None:
        print("\nO grafo não possui Tour de Euler.")
        return

    print("\nArestas percorridas (em ordem):")
    for i, (u, v) in enumerate(tour, 1):
        print(f"  {i}. {u} -> {v}")

    sequencia = [tour[0][0]] + [v for _, v in tour]
    print("\nTour de Euler:", " -> ".join(map(str, sequencia)))


if __name__ == "__main__":
    main()
