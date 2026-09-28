/**
 * Represents a node in a character trie.
 */
declare class CharTrieNode {
    is_leaf: boolean;
    children: Map<string, CharTrieNode>;
    /**
     * Create a new CharTrieNode.
     * @param is_leaf Whether the node is a leaf node or not.
     * @param children A map containing the node's children, where the key is a character and the value is a `CharTrieNode`.
     */
    constructor(is_leaf: boolean, children: Map<string, CharTrieNode>);
    /**
     * Returns a new `CharTrieNode` instance with default values.
     * @returns A new `CharTrieNode` instance with `is_leaf` set to `false` and an empty `children` map.
     */
    static default(): CharTrieNode;
}
/**
 * A trie structure to efficiently store and search for strings.
 */
declare class CharTrie {
    root: CharTrieNode;
    constructor();
    /**
     * Adds one or more `texts` to the trie.
     * @param texts The strings to add to the trie.
     */
    extend(texts: string[]): void;
    /**
     * Adds text to the trie.
     * @param text The string to add to the trie.
     */
    push(text: string): void;
    /**
     * Searches the trie for stored strings that match `chars` starting at `start`.
     * @param chars The input characters to search.
     * @param start The index to start searching from.
     * @yields Each stored string that is a prefix of `chars` starting at `start`.
     */
    common_prefix_search(chars: string[], start?: number): Generator<string>;
}
export default CharTrie;
