<!-- version: w03 | date: 2026-10-30 -->
# R3 — Memory research for Cammut (web research worker, 2026-10-29)

Scope: facts for the Cammut memory design. No project code was read or changed. No Cammut retain was made.
Method: direct page fetches (PowerShell `Invoke-WebRequest`), arXiv API lookups by title and by ID, GitHub REST API, `search_web`, Composio `exa_search`.
Firecrawl (Composio) returned HTTP 402 "insufficient credits", so it was not used.
Evidence tags: **[V]** = I read the primary page or arXiv abstract in this session. **[S]** = only a search summary or secondary page. **[U]** = unverified, from memory, or my own inference.
GitHub stars are a snapshot from the GitHub API on 2026-10-29.

---

## 1. mostik.ai

**What it is [V].** Mostik is a research startup that builds "latent communication between AI models". It is **not a memory product**. Source: https://mostik.ai and https://mostik.ai/read-more.
- What it claims: one model passes its hidden states to another model through a small trained "bridge". No text goes between the two models, and both models stay frozen. "Mostik" means "little bridge".
- First result (their own numbers, not peer reviewed): sender GLM-5.2 (753B), receiver Qwen-3.5 (4B). The large model only does prefill and never writes. The bridge closes 50% of the score gap, which is +25% accuracy for the small model. On harder subsets the uplift reaches 2x. They report 2.5x less compute than a mid-size model with the same score, and up to +10 percentage points over a text hand-off.
- Framing: one output token carries about 17 bits, against about 2 MB of hidden state per token. They link this to interpretability results: Hanna & Ameisen arXiv:2604.12493, Lindsey et al. 2025, Gurnee et al. 2026 ("J-space"), and Korbak et al. arXiv:2507.11473. I did not open these papers myself.
- Their advisor angle [V]: "Many systems already use a powerful model as an advisor ... Our approach removes the second payment". The advisor's guidance crosses as latent state, not as tokens. This is the same pattern as Anthropic's advisor tool (section 9), done at the hidden-state level.
- Ways to deploy (plans only): (a) low latency: a strong model contributes prefill state and a small model decodes; (b) batch: latent state moves between separate endpoints. Both need **open-weight models**. Closed APIs (Claude, Gemini) do not expose hidden states.
- Team and funding [V, from their own page]: 15 people (12 PhDs and a Fields Medalist). Past employers: Google X, NVIDIA, Perplexity, FAR.AI. They started about 4 months before publishing. Backers: General Catalyst, Foundation Capital. Contact: info@mostik.ai.
- Press [V]: WIRED, 2026-09-02, "These Russian Mathematicians Taught AI Models How to Talk to Each Other Without Using Words", https://www.wired.com/story/russian-startup-mostik-ai-models-communication/ . The search summary names Sasha Malysheva as CEO [S, not checked].
- **Papers: none found.** An arXiv search `all:mostik` gave 0 hits [V].
- **Public API, pricing, licence: none published** [V]. The site offers only "Talk to us".
- **GitHub [V, the link to the company is not proven]:** the org `github.com/mostik-ai` has 5 public forks with 0 stars: miles (RL post-training, fork of slime), harbor (agent eval), sglang, Megatron-LM, Megatron-Bridge. Their own site does not link to this org.
- **Verdict:** Mostik offers no memory, embedding, indexing or compression features. Its only link to the owner's plan is the idea of "advice as latent state" and the bet that the next scaling axis is inter-model communication. Treat it as a direction to watch. It is not a component Cammut can use today.
- Nearest *memory* matches, if the owner meant something else: MemPalace (section 3), Hindsight, Mem0. Nearest *latent hand-off* research: xRAG (a frozen LM with a trained bridge for retrieval embeddings, arXiv:2405.13792) and 500xCompressor (KV values as compressed context, arXiv:2408.03094).

## 2. Hindsight (vectorize-io)

- Paper [V]: Latimer et al., "Hindsight is 20/20: Building Agent Memory that Retains, Recalls, and Reflects", **arXiv:2512.12818** (2025-12-14). Also an ACL 2026 demo paper, DOI 10.18653/v1/2026.acl-demo.27 [S, found by Exa, DOI not opened].
- Four logical networks in the paper [V, abstract]: world facts, agent experiences, synthesized entity summaries, and evolving beliefs (the "opinion" network with confidence).
- Current README naming [V] (https://github.com/vectorize-io/hindsight): **world facts, experiences, observations, mental models**. "Observations" are consolidated beliefs backed by evidence, with exact quotes and a proof count. They are *refined, not overwritten*. "Mental models" are standing answers to a fixed question, rewritten in the background. Reading one is a plain DB read with no LLM call. "Knowledge pages" are mental models shown as a markdown wiki.
- **Retain** [V]: an LLM pulls out facts, time data, entities and relations. These are normalised into canonical entities, time series and sparse plus dense vectors.
- **Recall** [V]: four searches run in parallel: semantic (vector), keyword (BM25), graph (entity, temporal and causal links) and temporal (time range). The results are merged by **reciprocal rank fusion plus a cross-encoder reranker**, then trimmed to a **token budget** (not a fixed top-k).
- **Reflect** [V]: an agentic reasoning pass over the bank. It forms new links and answers questions that need thought.
- Banks [V]: strict isolation, with "disposition traits" (skepticism, literalism, empathy). An optional "Memory Defense" scans each retain against 45 secret and PII patterns and redacts or blocks matches.
- Benchmarks [V, abstract]: with an open 20B backbone, accuracy rises from 39% (full-context baseline) to 83.6%. With larger backbones: **91.4% on LongMemEval** and **up to 89.61% on LoCoMo**, against 75.78% for the strongest prior open system. The README says Virginia Tech (Sanghani Center) and The Washington Post reproduced these results. Live board: https://benchmarks.hindsight.vectorize.io/ .
- Licence MIT, about 56.2k stars, active [V, GitHub API]. Storage is PostgreSQL (embedded "pg0" or external), with Oracle as an option [V, README].
- Benchmarks used [V]: LongMemEval, arXiv:2410.10813 (500 questions; 5 abilities: extraction, multi-session reasoning, temporal reasoning, knowledge updates, abstention). LoCoMo, arXiv:2402.17753 (about 300 turns and 9K tokens per conversation, up to 35 sessions).

## 3. Competitors (ideas to borrow)

| System | Core idea | Evidence | Licence / stars |
|---|---|---|---|
| Mem0, arXiv:2504.19413 [V] | Extract, consolidate and retrieve salient facts; optional graph memory | LoCoMo: +26% relative LLM-judge over OpenAI memory; **91% lower p95 latency, >90% token cost saved** vs full context; graph variant about +2% | Apache-2.0, 68k |
| Zep / Graphiti, arXiv:2501.13956 [V] | Temporal knowledge graph that keeps historical edges | DMR 94.8% vs MemGPT 93.4%; LongMemEval up to +18.5% accuracy, −90% latency | Apache-2.0, 32k (graphiti) |
| Letta (MemGPT), arXiv:2310.08560 [V, title only] | OS-style paging between core memory and archival memory | — | Apache-2.0, 25k |
| A-MEM, arXiv:2502.12110 [V] | Zettelkasten notes (keywords, tags, context), auto-linking, **memory evolution** (a new note updates old notes) | Beats baselines on 6 models (no single number in the abstract) | MIT, 1.2k |
| MemOS, arXiv:2507.03724 [V] | "Memory OS": the MemCube unit holds content plus provenance and versioning; covers plaintext, activation (KV) and parameter memory | Repo claims 35.24% token savings [V, repo text, own claim] | Apache-2.0, 12k |
| Cognee [V, repo] | Memory platform built from a KG plus vectors | — | Apache-2.0, 33k |
| LangMem [V, repo] | LangChain memory toolkit | — | MIT, 1.7k |
| MemoRAG, arXiv:2409.05591 [V, title] | A global-memory model drafts clues that guide retrieval | — | Apache-2.0, 2.3k |
| HippoRAG 2, arXiv:2502.14802 [V] | Personalized PageRank over a KG plus passages | +7% on associative memory tasks over a SOTA embedder | MIT, 4.1k |
| RAPTOR, arXiv:2401.18059 [V, title] | Recursive tree of summaries (cluster, summarise, repeat) | — | MIT, 1.8k |
| GraphRAG, arXiv:2404.16130 [V, title] | Entity graph, community summaries, global queries | — | MIT, 36k |
| LightRAG, arXiv:2410.05779 [V, title] | Lighter graph RAG with two-level (local and global) retrieval | — | MIT, 40k |
| **MemPalace** [V, README] (exists) | Verbatim storage, no summaries. Hierarchy: *wings* (people or projects), *rooms* (topics), *drawers* (raw text). Pluggable backend (ChromaDB by default). Local first | Claims **96.6% R@5 on LongMemEval with zero API calls**. Note: this is *retrieval recall*, a different metric from Hindsight's QA accuracy | MIT, 60k |

Take-aways [U, my synthesis]: (1) keep verbatim evidence next to derived beliefs (Hindsight observations, MemPalace drawers); (2) temporal edges (Zep); (3) a summary tree for coarse levels (RAPTOR); (4) memory evolution and linking (A-MEM); (5) provenance and versioning per unit (MemOS MemCube).

## 4. The JEPA family

- I-JEPA, arXiv:2301.08243 [V, title]: images. It predicts the *embeddings* of masked target blocks from a context block, with no pixel reconstruction.
- V-JEPA 2, arXiv:2506.09985 [V, title]: video. "Self-Supervised Video Models Enable Understanding, Prediction and Planning". Code: facebookresearch/vjepa2, MIT [V].
- **LLM-JEPA**, arXiv:2509.14252 (Huang, LeCun, Balestriero; verified with verify_sources.py) [V]. It adds a JEPA loss in embedding space next to the next-token loss, for both fine-tuning and pretraining. The two "views" are paired, for example text and code (NL-RX, Spider, GSM8K, RottenTomatoes). Tested on Llama3, Gemma2, OpenELM and OLMo. It beats the standard objective and resists overfitting. Code: github.com/rbalestr-lab/llm-jepa, which now redirects to galilai-group/llm-jepa (Apache-2.0, 346 stars) [V].
- A text JEPA embedding model built for memory classification: **none found** [U]. No public, benchmarked "JEPA text embedder" exists (MTEB-style) that I could verify.
- Realistic role for Cammut [U, inference]:
  - Today: use a standard embedding model (MRL-trained, section 5) and a **small classifier head** (logistic regression or MLP) on frozen embeddings. It assigns memory type (world, experience, observation, decision, lesson), topic and project. This is cheap, measurable and retrainable.
  - "JEPA-style" means one specific thing: train a small **predictor** that maps an embedding of context (the query or the task) to the embedding of the memory that will be useful. That is a learned query-to-memory predictor in latent space. Train it on Cammut's own recall logs (which memory was used after which query). It is close to a dual encoder with an asymmetric predictor. Evidence level: *architecture / target*, not measured.
  - Do not call it a JEPA model unless it really has the context-encoder, target-encoder (EMA) and predictor structure.

## 5. Embeddings, quantisation, search

- **Matryoshka (MRL)**, arXiv:2205.13147 [V]: one embedding can be cut to shorter prefixes. Up to 14x smaller at the same accuracy (ImageNet), and up to 14x faster retrieval. Use a short prefix for the first pass and the full vector for rescoring.
- **HF embedding quantisation blog** [V], https://huggingface.co/blog/embedding-quantization :
  - binary: 32x smaller, up to 45x faster, about 96% of performance with rescoring (about 92.5% without);
  - int8: 4x smaller, up to 4x faster, about 99.3%.
  - Recipe: binary index in RAM, int8 vectors on disk, retrieve `rescore_multiplier × k` by Hamming distance, then rescore with the float32 query. Their demo: 41M Wikipedia texts in 5 GB RAM plus 50 GB disk, against 200 GB for float32.
- **Product quantisation**: the Faiss paper is arXiv:2401.08281 [V, title]. The original PQ paper is Jégou et al., TPAMI 2011 [U, from memory, DOI not checked]. Faiss: MIT, 41k [V].
- **USearch** (Apache-2.0, 4.4k) [V]: an HNSW library in one file, with C, Go and Python bindings. It fits a Go gateway.
- **LanceDB / Lance format** (Apache-2.0, 7.2k) [V]: columnar format with fast random access, a vector index and versioning. Paper arXiv:2504.15247 [V]: Parquet tuned well gets >60x better random access than default; Lance's structural encoding does it without losing scan speed.
- **ColBERTv2**, arXiv:2112.01488, and **PLAID**, arXiv:2205.09707 [V]: late interaction (token-level MaxSim). PLAID is up to 7x faster on GPU and 45x on CPU than vanilla ColBERTv2, at 140M passages. Costly in storage; use it only for a rerank tier [U].
- **Hybrid**: BM25 plus dense plus RRF plus a cross-encoder is exactly what Hindsight already does [V, README]. Cammut does not need to rebuild this.
- Reranker models (bge-reranker, Cohere Rerank, etc.): [U], not checked this session.

## 6. Binary indexed formats and a "memory BAM"

Facts from the spec [V], from samtools/hts-specs `SAMv1.tex` and `CSIv1.tex` (https://github.com/samtools/hts-specs). SAM paper DOI 10.1093/bioinformatics/btp352; tabix DOI 10.1093/bioinformatics/btq671 (both verified with verify_sources.py).
- **BGZF**: a chain of gzip members. Each block holds **≤ 65,536 bytes uncompressed** (ISIZE ∈ [0, 65536]). An extra field holds BSIZE, so a reader can jump from block to block. The 28-byte **EOF marker** block catches truncation.
- **Virtual file offset**: a uint64 = `coffset << 16 | uoffset` (48 bits of compressed file offset, 16 bits inside the block). These offsets can be compared but not subtracted.
- **BAI**: per reference, a **binning index** (≤ 37,450 bins, 6 levels of 2^29…2^14 bp; bins 4681–37448 cover 16 kbp each). Each bin holds chunks of (beg, end) virtual offsets. A **linear index** of 16 kbp windows gives the smallest offset per window, so the reader skips chunks that cannot overlap. The limit is a reference ≤ 2^29−1.
- **CSI** generalises this with `min_shift` and `depth` (the reg2bin/reg2bins code in the spec), so coordinates can be much longer.
- **tabix**: the same BGZF plus index for any coordinate-sorted TAB file.
- Modern analogues:
  - **Parquet page index** [V] (https://parquet.apache.org/docs/file-format/pageindex/): OffsetIndex and ColumnIndex give min and max per page, so a point lookup on the sort column reads one page per column.
  - **Lance** [V]: random access plus vector index plus versions.
  - **Arrow IPC** and **SQLite** (B-tree pages plus FTS5) [U, from memory].

**Draft "Memory BAM" (MBAM) design** [U, design proposal; evidence level *architecture*]:
1. **Sort key** = (`project_id`, `topic_id`, `t_ms`, `memory_id`). Each (project, topic) pair acts like a reference sequence ("contig"). Time is the coordinate. A memory's "span" = [t_start, t_end) of the events it covers. A decision is a point; a summary covers a range.
2. **Record** (little-endian, varints): `len | memory_id(16B ULID) | type(u8: world/experience/observation/mental_model/lesson/decision) | flags (superseded, redacted, pinned) | t_start | t_end | confidence(f16) | tags (dict-coded u32[]) | provenance (source, agent, session) | supersedes[] | text (UTF-8) | emb_bin (D/8 bytes) | emb_i8 (D bytes, optional)`.
3. **Blocks**: like BGZF but with **zstd** frames, ≤ 64 KiB uncompressed each, using a **per-project trained zstd dictionary** (small records compress poorly without one [U]). Add a block header with BSIZE and an xxhash checksum, plus an EOF block.
4. **Virtual offset** = `block_file_offset << 16 | in_block_offset`. The same idea as BAM.
5. **Index (.mbi)**: per contig, a CSI-style binning index over time (for example min_shift = 16 for about 65 s leaf bins and depth = 6; tune these) plus a linear index of fixed time windows. Sidecar indexes store **virtual offsets as payloads**:
   - a binary-HNSW or IVF over `emb_bin` (USearch), with int8 rescoring read from the record;
   - a BM25 postings file (term → virtual offsets);
   - an entity table (entity → virtual offsets), for graph hops.
6. **Writes**: append-only segment files (sorted inside each segment), plus periodic **compaction**, a merge sort into a new generation. This is LSM-like, and it keeps BAM's "sorted file" property per generation [U].
7. **Supersede**: never rewrite in place. A new record carries `supersedes=[old_id]`, and a tombstone bitmap hides the old record at read time. This matches the Cammut rule "mark stale, supersede".
8. Build or buy [U]: Lance or Parquet already give sorted columnar blocks, page indexes and vector indexes. Write a custom MBAM only if a single portable file and BAM-like streaming really matter. Otherwise MBAM = a Lance dataset sorted by the key above, plus a small CSI-style time index.

## 7. Context compression: real numbers and an honest 10:1

Published numbers [V, abstracts]:

| Method | arXiv | Ratio | Quality |
|---|---|---|---|
| LLMLingua | 2310.05736 | up to 20x | "little performance loss" (GSM8K, BBH, ShareGPT, arXiv) |
| LongLLMLingua | 2310.06839 | about 4x (NQ); 2–6x on 10k-token prompts | +21.4% on NQ (it removes distractors); 94% cost cut on LooGLE |
| LLMLingua-2 | 2403.12968 | 2–5x | 3–6x faster than earlier compressors; 1.6–2.9x end-to-end speed-up |
| Gist tokens | 2304.08467 | up to 26x (prompts) | "minimal loss"; −40% FLOPs. Needs model fine-tuning |
| ICAE | 2307.06945 | 4x | memory slots; about 1% extra parameters |
| AutoCompressors | 2305.14788 | summary vectors (soft prompts) | better perplexity over 30k tokens. Needs fine-tuning |
| xRAG | 2405.13792 | one token per document | matches uncompressed models on some sets; 3.53x fewer FLOPs. Frozen LM plus a bridge |
| 500xCompressor | 2408.03094 | 6x–480x | keeps **only 62–73%** of capability |
| KV: SnapKV | 2404.14469 | 8.2x memory at 16K tokens | comparable on 16 long-context sets |
| KV: KIVI (2-bit) | 2402.02750 | 2.6x peak memory | "almost the same quality" |
| KV: H2O | 2306.14048 | heavy-hitter eviction | [title verified only] |
| Lost in the Middle | 2307.03172 | — | accuracy falls for facts placed mid-context, so filling 1M tokens is not free [title verified; finding from memory, U] |

Caching (cost, not window size) [V]:
- **Anthropic** (https://platform.claude.com/docs/en/build-with-claude/prompt-caching):
  - TTL 5 min (write 1.25x base input) or 1 h (write 2x).
  - Read 0.1x, but 0.05x on Opus 5.5 and Sonnet 5.5, and 0.025x on Fable 5.1 and Mythos 5.1.
  - Minimum cacheable prompt: 512 tokens on the 5.x models; 1,024–4,096 on older models.
- **Gemini** (https://ai.google.dev/gemini-api/docs/caching and /pricing):
  - Implicit caching is on by default for 2.5 and newer. Explicit caches are **not supported on Gemini 4 Argon and later**, or in the Interactions API.
  - Minimum prompt: 4,096 tokens (Argon, 3.x Flash).
  - Argon: input $2.00/M, cache $0.20/M (0.1x) through 2026-11-30, then $4.00 and $0.40.
  - Gemini 3.8 Flash: cache $0.075/M plus storage $0.50/M tokens/hour through 2026-12-31.
  - Agent loops on Argon: the full previous request is cached only if the new turn adds ≥ 2,050 tokens.

**Honest answer on "1M window ≈ 10M history at 10:1"** [U, my analysis, built on the numbers above]:
- **Lossless byte compression does not shrink the context window.** The model reads tokens, not bytes. zstd only cuts *storage*. zstd 1.5.7 −1 gets 2.896x on the Silesia corpus [V, zstd README]; higher levels and dictionaries give more on plain text (about 3–5x, U).
- **Lossless 10:1 in tokens is not achievable** for general text. Every token-level method above is lossy (selection, summary or soft tokens).
- **Soft-token methods** (gist, ICAE, xRAG, 500x, Mostik-style latents) need access to model weights. They **cannot** run against the Claude or Gemini APIs. They only work with self-hosted open models.
- So **10:1 is achievable only as "effective" coverage.** It comes from a **tiered, lossy store plus retrieval**, with an *expected* recall below 100%. It must be measured on Cammut's own question set.

**Tiered model** [U, proposed math]. Let H be the history in tokens, W the window, and Q the retrieval budget per turn.
- Tiers: hot h (verbatim), warm w (summaries/observations at ratio r_w), cold c (index cards at ratio r_c, plus on-demand fetch).
- Budget: $W \ge H_h + H_w/r_w + H_c/r_c + Q$, with $H = H_h + H_w + H_c$. Effective ratio $\rho = H / W$.
- Expected fact recall: $E[R] = p_h\,a_h + p_w\,f_w\,a_h + p_c\,R@k\,a_h$. Here $p_i$ = the share of needed facts in tier i, $f_w$ = the chance a fact survives summarisation, $R@k$ = retrieval recall, and $a_h$ = reader accuracy on verbatim text (under lost-in-the-middle it falls as W fills).
- Worked example (all parameter values are *targets*, not measured):
  - H = 10M tokens, made of hot 0.3M (ratio 1), warm 3M at r_w = 10 → 0.3M, and cold 6.7M at r_c = 100 → 0.067M cards.
  - Add Q = 0.3M for fetched evidence. Total ≈ 0.97M, so ρ ≈ 10.3.
  - With p = (0.3, 0.3, 0.4), f_w = 0.8, R@k = 0.9 and a_h = 0.9: E[R] ≈ 0.27 + 0.216 + 0.324 = **0.81**.
- Cost with caching: per turn, about $c_{in}\,[\,(1-\kappa)W + \kappa W m_{read}\,]$, where κ is the cached share. With m_read = 0.1 (or 0.05 on Opus/Sonnet 5.5), a stable hot+warm prefix makes a 1M window affordable [U].
- Better than filling 1M [U]: keep W small (100–200k) and raise R@k. Hindsight's token-budget recall already does this. Mem0 reports >90% token savings with a small window [V].

## 8. Composio and open gateway alternatives

- Composio sessions (= **Tool Router**) [V] (https://docs.composio.dev/docs/how-composio-works.md):
  - API path `/api/v3.1/tool_router/session`.
  - A session scopes the user ID, tool access (toolkits, tools or tags), auth (managed or own OAuth, connected-account choice) and execution state (logs, tool memory, MCP state, sandbox files).
  - By default the agent gets **meta tools** to search, authorise and execute tools at runtime, instead of loading hundreds of tool schemas. Sessions are also served over MCP ("Sessions via MCP").
- Products [V, composio.dev]:
  - 1,500+ toolkits;
  - "MCP Gateway" (one managed MCP endpoint);
  - "Instant" tools (audio, video, search, browser, data with no keys of your own; billed from the Composio balance at "0% markup" plus normal tool-call charges);
  - "Firewall" (blocks prompt injection hidden in tool results);
  - a CLI.
- Pricing [V, https://composio.dev/pricing]:
  - **Hobby** $0, hard-capped: 100K tool calls/month, unlimited connections, custom tools and MCP, 3 seats.
  - **Pro** $29/month, with a $29 usage credit that does not roll over: unlimited seats, spend controls. Overage is about $0.0003 per call [S].
  - **Enterprise**: custom (SSO/SCIM, customer-managed keys, BAA).
  - Composio-managed OAuth apps give 20K free calls, then an extra fee. Branded connect page: $0.30 per connection, one time, on Pro.
- **Rube** [S]: a consumer "universal MCP" app built on Composio. https://rube.app gave a TLS EOF error during my fetch, so the details are unverified.
- An open, self-hosted equivalent needs [U]:
  1. a tool catalogue with JSON schemas plus embeddings, for **tool search**;
  2. an OAuth broker and **secret vault** (encrypted refresh tokens, per-user connected accounts, refresh jobs);
  3. **per-agent / per-session scopes** (allow-lists of toolkit, tool and tag; read vs write);
  4. meta tools (search, authorise, execute), so the context stays small;
  5. an audit log and rate limits;
  6. a sandbox for large outputs;
  7. an injection filter on tool results.
- Open alternatives [V, GitHub API]:
  - MetaMCP (MIT, 2.7k): aggregator plus middleware plus gateway in one docker. Last push 2026-06.
  - MCPJungle (MPL-2.0, 1.3k): a self-hosted registry and gateway.
  - ToolHive (Apache-2.0, 2.3k): runs and manages MCP servers in containers.
  - Docker MCP Gateway (MIT, 1.6k): the `docker mcp` CLI plugin.
  - Smithery: a hosted registry and gateway [U, not checked].

## 9. Anthropic "stronger model guidance" = the **Advisor tool**

[V] https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool
- Name: **Advisor tool**, beta. Header: **`anthropic-beta: advisor-tool-2026-03-01`**. Tool type: **`advisor_20260301`**, name `"advisor"`.
- How it works:
  1. The executor model decides when to call the tool. It emits a `server_tool_use` with an empty input.
  2. Anthropic runs the advisor model server-side, with its own system prompt and the **full executor transcript**.
  3. The result comes back as an `advisor_tool_result`.
  4. All of this happens inside **one `/v1/messages` request**.
  - The advisor has no tools. Its thinking is dropped, and only the advice text reaches the executor.
- Parameters:
  - `model` (required);
  - `max_uses` (a per-request cap; over the cap you get `max_uses_exceeded`);
  - `max_tokens` (≥ 1024, caps the advisor's thinking plus text);
  - `caching` (off by default; for the advisor's own transcript; turn it on only if you expect ≥ 3 calls).
- **Billing**: the advisor runs as a separate sub-inference **at the advisor model's rates**. Look for `usage.iterations[]` entries with `type: "advisor_message"`. The top-level `usage` counts executor tokens only. Typical advisor output: 400–700 text tokens (1,400–1,800 with thinking). The advisor does not draw from the executor's `max_tokens` or task budget.
- Pairs: the advisor must be ≥ Sonnet 4.6 and at least as capable as the executor. Example executors are Sonnet 5 or Haiku 5.5, with Opus 5.5 or Fable 5.1 as the advisor.
- Result variants: with `claude-opus-5-5` as the advisor, the result is **encrypted** (`advisor_redacted_result`), so the client cannot read the advice. `claude-opus-4-8` returns plaintext `advisor_result`.
- Platforms: Claude API, Claude Platform on AWS, and Claude on Google Cloud (Anthropic-managed), all beta. Managed Agents use a `multiagent.advisor` block instead.
- **Equivalents**:
  - **OpenRouter `openrouter:advisor`** server tool, beta [V] (https://openrouter.ai/docs/guides/features/server-tools/advisor.md): any OpenRouter model can be the advisor, and you can name several advisors. It keeps cross-request memory when you replay the transcript. It works on the Chat Completions, Responses and Anthropic Messages APIs.
  - **LiteLLM** advisor orchestration for non-Anthropic providers [S].
  - **OpenAI / Gemini: no native equivalent found** [S]. Build it with function calling: a `consult_advisor` tool that your gateway routes to the stronger model.

---

## Design implications for Cammut [U unless marked; these are proposals]

1. **Keep Hindsight as the memory engine.** It already does 4-way hybrid recall with RRF, a reranker and token budgets, plus observations and mental models (MIT, SOTA on LongMemEval and LoCoMo) [V]. Build *around* it, not instead of it.
2. **Map Cammut types onto Hindsight types.** World fact = verified fact. Experience = session event. Observation = consolidated lesson. Mental model = standing answers such as "current Cammut architecture" and "the owner's rules". Mental models make session boot a DB read with no LLM call [V].
3. **The classifier is a small head on frozen embeddings**, trained on labelled Cammut memories. It outputs type, topic and project. Call it "JEPA-style" only when a learned query→memory predictor is trained on recall logs. Report its accuracy on a held-out set.
4. **Embeddings**: one MRL-capable model. Store binary vectors (RAM) plus int8 vectors (disk) and rescore. Expect about 96–99% of float32 quality at 4–32x less memory [V, HF blog].
5. **The "memory BAM" is an export and archive format first.** Sort by (project, topic, time). Use 64 KiB zstd blocks with a per-project dictionary, BAM virtual offsets, a CSI-style time binning plus linear index, and sidecar vector, BM25 and entity indexes that point to virtual offsets. Prototype it on Lance before writing a custom codec.
6. **Append-only plus supersede links plus compaction.** This matches the "mark stale, never delete silently" rule and gives reproducible snapshots (one generation = one file).
7. **State the 10:1 claim honestly.** Lossless compression saves disk only (zstd about 2.9x at −1 on Silesia [V]). Token-level 10:1 is lossy and must ship with a measured E[recall] on a Cammut question set (start with 100–200 questions from real sessions, in LongMemEval style).
8. **Tiered context**: hot verbatim, warm observations and mental models, cold index cards plus on-demand fetch. Track ρ and E[R] with the formula in section 7. Prefer a 100–200k working window with high R@k over filling 1M (lost-in-the-middle).
9. **Put the stable prefix (rules plus mental models) first** so prompt caching hits. On Anthropic, cache reads are 0.05–0.1x input (5 min or 1 h TTL). On Gemini 4 only implicit caching exists, with a ≥ 4,096-token minimum and +2,050 tokens per turn for the full prefix to be reused [V].
10. **Soft-token or latent compression (gist, xRAG, Mostik bridge) works only with self-hosted open models.** Keep it as a research track for a local model on the Contabo box, not for Claude or Gemini calls.
11. **Gateway**: copy the Composio session design. Per-agent scopes, meta tools (search, authorise, execute), an OAuth vault, an audit log and an injection filter on tool results. MetaMCP, MCPJungle and ToolHive are open bases to review before building more in Go.
12. **Tool search = memory search.** Index tool schemas in the same hybrid index (as a separate bank), so agents load only the few tools they need.
13. **Advisor routing in the gateway.** For Claude calls, add `advisor_20260301` (Sonnet or Haiku executor, Opus advisor). Use a `max_uses` cap and count calls per conversation on the client side. Log `usage.iterations` for cost. For Gemini or other providers, offer an equivalent `consult_advisor` tool (or OpenRouter's). Note that Opus 5.5 advice is encrypted, so it cannot be retained in memory. Use a plaintext advisor (Opus 4.8) when the advice must be stored.
14. **Retain the provenance of every derived memory** (source IDs, agent, model, timestamp): Hindsight-style evidence quotes plus MemOS-style versioning. This keeps the "no source, no claim" rule auditable.
15. **Watch Mostik as a direction only.** It has no API, no paper and no memory product. Revisit if they publish a bridge for open models that Cammut could host.

Sources opened this session: mostik.ai, /read-more; WIRED (title and date); arXiv API for every ID above; GitHub API repo metadata; the Hindsight and MemPalace READMEs; Anthropic advisor and prompt-caching docs; Gemini caching and pricing pages; Composio pricing and docs; OpenRouter advisor docs; the HF embedding-quantization blog; the zstd README; hts-specs SAMv1.tex and CSIv1.tex; the Parquet page-index doc.
