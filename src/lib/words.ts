/**
 * Pool de palavras em português para o Palácio da Memória.
 * Organizadas em categorias para facilitar a criação de histórias visuais.
 */

const WORD_POOL: string[] = [
    // Animais
    'Elefante', 'Leão', 'Girafa', 'Polvo', 'Flamingo', 'Lobo', 'Cobra', 'Águia',
    'Boto', 'Pinguim', 'Rinoceronte', 'Camelo', 'Urso', 'Tigre', 'Canguru', 'Tubarão',
    'Papagaio', 'Formiga', 'Borboleta', 'Baleia', 'Raposa', 'Cavalo', 'Golfinho', 'Coruja',

    // Objetos cotidianos
    'Espelho', 'Relógio', 'Cadeira', 'Janela', 'Telefone', 'Chave', 'Lanterna', 'Mochila',
    'Guarda-chuva', 'Bússola', 'Óculos', 'Mala', 'Cofre', 'Corda', 'Faca', 'Tesoura',
    'Caixinha', 'Lente', 'Régua', 'Almofada', 'Câmera', 'Capacete', 'Binóculo', 'Martelo',

    // Alimentos
    'Maçã', 'Melancia', 'Abacaxi', 'Manga', 'Cenoura', 'Brócolis', 'Tomate', 'Abóbora',
    'Chocolate', 'Sorvete', 'Pizza', 'Bolo', 'Queijo', 'Pão', 'Mel', 'Limão',
    'Pimenta', 'Alho', 'Cebola', 'Salsa', 'Morango', 'Uva', 'Banana', 'Pera',

    // Lugares
    'Castelo', 'Floresta', 'Deserto', 'Caverna', 'Biblioteca', 'Farol', 'Vulcão', 'Ilha',
    'Metrô', 'Hospital', 'Mercado', 'Museu', 'Porto', 'Cemitério', 'Catedral', 'Palácio',
    'Montanha', 'Praia', 'Pântano', 'Mansão', 'Laboratório', 'Estação', 'Praça', 'Jardim',

    // Conceitos e ações
    'Sorte', 'Medo', 'Coragem', 'Sabedoria', 'Viagem', 'Segredo', 'Mistério', 'Vitória',
    'Sombra', 'Eco', 'Caos', 'Silêncio', 'Espiral', 'Cristal', 'Chama', 'Vórtice',
    'Aurora', 'Eclipse', 'Névoa', 'Tormenta', 'Êxtase', 'Âncora', 'Labirinto', 'Portal',

    // Profissões e pessoas
    'Detetive', 'Astronauta', 'Mágico', 'Pirata', 'Arquiteto', 'Alquimista', 'Caçador', 'Monge',
    'Guerreiro', 'Cientista', 'Aventureiro', 'Mercador', 'Mensageiro', 'Curandeiro', 'Explorador', 'Viajante',

    // Cores e formas
    'Carmesim', 'Turquesa', 'Cianoide', 'Prismático', 'Escarlate', 'Dourado', 'Violeta', 'Âmbar',
];

/** Remove duplicatas e embaralha o pool */
const UNIQUE_POOL = Array.from(new Set(WORD_POOL));

/**
 * Sorteia `count` palavras únicas do pool.
 * @param count número de palavras (3-30)
 */
export function drawWords(count: number): string[] {
    const shuffled = [...UNIQUE_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, UNIQUE_POOL.length));
}

/** Opções válidas de quantidade de palavras */
export const WORD_COUNT_OPTIONS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;
export type WordCount = (typeof WORD_COUNT_OPTIONS)[number];
