import os
from pathlib import Path

BASE_DIR = Path(".")
PROMPTS_DIR = BASE_DIR / "prompts"
EN_DIR = PROMPTS_DIR / "en"
AR_DIR = PROMPTS_DIR / "ar"

EN_DIR.mkdir(parents=True, exist_ok=True)
AR_DIR.mkdir(parents=True, exist_ok=True)

# 1. JUDGE SYSTEM
EN_DIR.joinpath("judge_system.txt").write_text(
    "You are a literary critic and novel editor. You evaluate fiction with precision. "
    "Always respond with valid JSON. No markdown fences, no preamble -- just the JSON object."
)
AR_DIR.joinpath("judge_system.txt").write_text(
    "أنت ناقد أدبي ومحرر روائي خبير. تقوم بتقييم الأعمال الأدبية بدقة شديدة وبلغة عربية فصحى رصينة. "
    "يجب أن تكون إجابتك دائماً بتنسيق JSON صحيح. لا تكتب أي مقدمات أو تعليقات خارج كود الـ JSON."
)

# 2. EVALUATE CHAPTER
EN_DIR.joinpath("evaluate_chapter.txt").write_text("""Evaluate this literary novel chapter against the planning docs.

SCORING CALIBRATION:
  9-10: Among the best chapters you've read in published fiction.
  7-8:  Strong, publishable with editorial polish. Specific flaws exist.
  5-6:  Functional but flat. A competent draft that needs substantial revision.
  3-4:  Significant problems. Voice breaks, beats missed, prose generic.
  1-2:  Not usable. Rewrite from scratch.

  The MEDIAN score for a competent AI-generated chapter should be 6.
  Most dimensions should score 6-7. Reserve 8+ for genuine excellence.

MANDATORY: For each dimension, you must identify:
  (a) The single WEAKEST MOMENT -- quote the specific sentence or passage
  (b) What would make it better -- a concrete revision, not a vague note

VOICE DEFINITION:
{voice}

WORLD BIBLE (summary):
{world}

CHARACTER REGISTRY:
{characters}

CANON (established hard facts):
{canon}

CHAPTER OUTLINE ENTRY:
{chapter_outline}

PREVIOUS CHAPTER (last 1500 words):
{prev_chapter_tail}

THE CHAPTER TO EVALUATE:
{chapter_text}

Score these dimensions (0-10):
- voice_adherence: Does the prose match voice.md? 
- beat_coverage: Did it hit every beat from the outline in scenes (not summary)?
- character_voice: Remove dialogue tags mentally. Can you tell who's speaking?
- plants_seeded: Were foreshadowing elements placed naturally?
- prose_quality: Sentence variety, specificity, show-don't-tell.
- continuity: Does it follow logically from the previous chapter?
- canon_compliance: Check ALL facts against canon.
- lore_integration: Does the world do WORK in this chapter?
- engagement: Would a reader turn the page?

Respond with JSON:
{{
  "voice_adherence": {{"score": 0, "weakest_moment": "quote", "fix": "...", "note": "..."}},
  "beat_coverage": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "character_voice": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "plants_seeded": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "prose_quality": {{"score": 0, "weakest_sentence": "quote", "fix": "...", "strongest_sentence": "quote", "note": "..."}},
  "continuity": {{"score": 0, "note": "..."}},
  "canon_compliance": {{"score": 0, "violations": [], "note": "..."}},
  "lore_integration": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "engagement": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "three_weakest_sentences": [],
  "three_strongest_sentences": [],
  "ai_patterns_detected": [],
  "overall_score": 0,
  "weakest_dimension": "...",
  "top_3_revisions": [],
  "new_canon_entries": []
}}
""")

AR_DIR.joinpath("evaluate_chapter.txt").write_text("""قم بتقييم هذا الفصل من الرواية الأدبية مقارنة بمستندات التخطيط. النص باللغة العربية، ويجب أن يكون التقييم باللغة العربية الفصحى.

معايرة التقييم (SCORING CALIBRATION):
  9-10: من أفضل ما يمكن قراءته في الأدب المنشور.
  7-8: قوي وصالح للنشر مع بعض التحرير. هناك عيوب لكنها لا تفسد متعة القراءة.
  5-6: وظيفي لكنه مسطح أو نمطي. مسودة تحتاج مراجعة جوهرية.
  3-4: مشاكل كبيرة في السرد، أو تجاهل للمخطط، أو لغة ركيكة ومترجمة.
  1-2: غير صالح للاستخدام. يجب إعادة كتابته بالكامل.

  متوسط التقييم لنص ذكاء اصطناعي جيد هو 6. لا تمنح 8 أو أكثر إلا للتميز الحقيقي.

إلزامي: لكل معيار تقييم، يجب أن تستخرج:
  (أ) أضعف لحظة/جملة - اقتبسها بدقة من النص.
  (ب) كيفية تحسينها - اقتراح تعديل ملموس وليس ملاحظة عامة.

دليل الصوت والأسلوب (VOICE DEFINITION):
{voice}

عالم الرواية (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTER REGISTRY):
{characters}

الحقائق الثابتة (CANON):
{canon}

مخطط الفصل (CHAPTER OUTLINE ENTRY):
{chapter_outline}

خاتمة الفصل السابق (PREVIOUS CHAPTER):
{prev_chapter_tail}

الفصل المراد تقييمه (THE CHAPTER TO EVALUATE):
{chapter_text}

قم بتقييم المعايير التالية (من 0 إلى 10):
- voice_adherence: هل يلتزم النص بدليل الأسلوب؟ هل اللغة عربية فصحى أصيلة أم تبدو مترجمة؟
- beat_coverage: هل غطى النص جميع نبضات المخطط في مشاهد حية (وليس كتلخيص)؟
- character_voice: هل حوار الشخصيات متمايز ويعكس خلفياتها ومستوياتها الاجتماعية؟
- plants_seeded: هل تم زرع التمهيدات (foreshadowing) بذكاء وبطريقة طبيعية؟
- prose_quality: جودة السبك اللغوي، تنوع الجمل، والتجسيد الحسي (إظهار المشاعر بدلاً من تقريرها).
- continuity: هل يتسق منطقياً وشعورياً مع الفصل السابق؟
- canon_compliance: هل هناك أي خرق للحقائق الثابتة في الرواية؟
- lore_integration: هل تفاصيل عالم الرواية توظف لخدمة الحدث أم أنها مجرد ديكور؟
- engagement: هل يجذب النص القارئ؟ هل هناك مفاجآت أو تصاعد حقيقي في التوتر؟
- slop_and_cliches: (خاص باللغة العربية) هل يحتوي النص على كليشيهات الذكاء الاصطناعي مثل "يتسلل إلى أعماقه"، "موجة من الـ"، "اتسعت عيناه"، "صمت ثقيل"، أو أي تراكيب لغوية نمطية ومكررة؟

استجب بصيغة JSON فقط:
{{
  "voice_adherence": {{"score": 0, "weakest_moment": "اقتباس", "fix": "...", "note": "..."}},
  "beat_coverage": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "character_voice": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "plants_seeded": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "prose_quality": {{"score": 0, "weakest_sentence": "اقتباس", "fix": "...", "strongest_sentence": "اقتباس", "note": "..."}},
  "continuity": {{"score": 0, "note": "..."}},
  "canon_compliance": {{"score": 0, "violations": [], "note": "..."}},
  "lore_integration": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "engagement": {{"score": 0, "weakest_moment": "...", "fix": "...", "note": "..."}},
  "slop_and_cliches": {{"score": 0, "found_cliches": ["قائمة بالكليشيهات الموجودة"], "penalty": 0.0, "note": "خصم من 0 إلى 10 بناءً على كمية الكليشيهات واللغة النمطية"}},
  "three_weakest_sentences": [],
  "three_strongest_sentences": [],
  "overall_score": 0,
  "weakest_dimension": "...",
  "top_3_revisions": [],
  "new_canon_entries": []
}}
""")

# 3. DRAFT SYSTEM PROMPT
EN_DIR.joinpath("writer_system.txt").write_text(
    "You are a literary fiction writer drafting a novel. "
    "CRITICAL: Do NOT include any conversational preamble, pleasantries, or meta-commentary. "
    "Start IMMEDIATELY with the scene prose.\n\n"
    "You write in third-person limited past tense, locked to one POV character. "
    "You follow the voice definition exactly. You never use words from the banned list. "
    "Your prose is specific, sensory, grounded. You vary sentence length. You trust the reader."
)
AR_DIR.joinpath("writer_system.txt").write_text(
    "أنت روائي محترف في الأدب القصصي الرفيع، تكتب باللغة العربية الفصحى الأصيلة.\n"
    "تنبيه صارم: ابدأ كتابة النص الروائي مباشرة دون أي مقدمات تحاورية، أو مجاملات، أو تعليقات تمهيدية. "
    "ابدأ فوراً بالسرد.\n\n"
    "القواعد الصارمة:\n"
    "1. الكتابة بضمير الغائب المحدود (Third-person limited) في زمن الماضي، مقيداً بوجهة نظر بطل المشهد.\n"
    "2. لغة عربية فصيحة، سبك أدبي متين، مع تجنب الترجمة الحرفية للكليشيهات الإنجليزية.\n"
    "3. إظهار المشاعر عبر ردود الفعل الجسدية والحسية المباشرة (Show, Don't Tell).\n"
    "4. الحوار باللغة العربية الحية التي تعكس طبيعة كل شخصية.\n"
)

# 4. SEGMENTED DRAFT PROMPT
EN_DIR.joinpath("draft_segment.txt").write_text("""Draft the next segment of Chapter {chapter_num}.

SEED CONCEPT:
{seed}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE GUARDRAILS:
{voice}

FULL CHAPTER OUTLINE (Context):
{chapter_outline}

=========================================
PREVIOUSLY WRITTEN SCENES IN THIS CHAPTER:
{previous_scenes_text}

YOUR TASK:
Write the next scene/segment focusing STRICTLY on the following beats:
{current_beats}

WRITING INSTRUCTIONS:
1. Continue seamlessly from the previously written text (if any). Do not repeat what was already written.
2. Target ~800-1000 words for this specific segment. Give the beats room to breathe.
3. Use deep sensory detail, grounded dialogue, and rich prose.
4. Do NOT rush to the end of the chapter. ONLY write the beats assigned to you in this segment.
5. Output ONLY the prose. No headers like "Scene 1" or conversational text.
""")

AR_DIR.joinpath("draft_segment.txt").write_text("""اكتب المشهد/الجزء التالي من الفصل {chapter_num}.

الفكرة الأساسية (SEED):
{seed}

عالم الرواية (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

دليل الأسلوب (VOICE):
{voice}

مخطط الفصل كاملاً (للسياق فقط):
{chapter_outline}

=========================================
المشاهد التي تمت كتابتها بالفعل في هذا الفصل (استمر منها):
{previous_scenes_text}

مهمتك الآن:
كتابة المشهد/الجزء التالي مع التركيز **حصرياً** على النبضات السردية التالية:
{current_beats}

تعليمات الكتابة:
1. أكمل السرد بسلاسة من حيث انتهت المشاهد السابقة (إن وجدت). لا تكرر ما كُتب سابقاً.
2. استهدف حوالي 800 إلى 1000 كلمة لهذا الجزء فقط. أعطِ الأحداث مساحتها الكافية للتنفس.
3. استخدم التفاصيل الحسية الدقيقة، والحوار الحي، والسبك الأدبي الرصين.
4. لا تتسرع للوصول إلى نهاية الفصل. اكتب **فقط** النبضات المخصصة لك في هذه المهمة، ولا تستبق الأحداث.
5. أخرج النص الروائي فقط. لا تكتب أي عناوين مثل "المشهد الأول" ولا أي مقدمات.
""")

print("Bootstrapped prompts successfully.")
