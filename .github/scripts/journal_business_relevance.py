#!/usr/bin/env python3
"""Topic relevance gate for WEBU Journal, a research digest for entrepreneurs.

Only the original paper title is used to assert relevance. A generic mention
of AI, technology, leadership or a business-related phrase deep in the abstract
must not turn unrelated research into business advice.
This is a conservative first-stage filter, NOT independent editorial review.
"""
import re

BUSINESS_TITLE = re.compile(
    r"\b(?:"
    r"business(?:es)?|enterprise(?:s)?|entrepreneur(?:ship|s)?|"
    r"SMEs?|MSMEs?|firms?|compan(?:y|ies)|start[- ]?ups?|founders?|"
    r"employee(?:s)?|employer(?:s)?|workplace|workforce|"
    r"organizational|organisational|human resources?|human capital|"
    r"job satisfaction|work[- ]life balance|working conditions|"
    r"marketing|consumer(?:s)?|customer(?:s)?|retail(?:ing)?|"
    r"e-?commerce|sales|pricing|purchase intention|"
    r"brand(?:ing)?|loyalty|hospitality|tourism|hotel(?:s)?|restaurant(?:s)?|"
    r"accounting|financial|finance|banking|credit|"
    r"supply chain|manufactur(?:ing|er|ers)?|productivity|"
    r"management|manager(?:s)?|corporate|trade|"
    r"digital transformation|industry 4[.]0|"
    r"commercialization|commercialisation|service quality"
    r")\b",re.IGNORECASE)

def relevant_to_entrepreneurs(source):
    """True only if title itself describes a credible business-adjacent topic."""
    title = source.get("title", "")
    return isinstance(title, str) and bool(BUSINESS_TITLE.search(title))

if __name__ == "__main__":
    examples = [
        ({"title":"Marketing adoption and customer loyalty in small firms"}, True),
        ({"title":"Employee engagement, autonomy and workplace wellbeing"}, True),
        ({"title":"Financial literacy and productivity in manufacturing SMEs"}, True),
        ({"title":"Digital leadership and performance in tourism SMEs"}, True),
        ({"title":"Ethnoeducation, Afro-descendant youth leadership, and AI literacy"}, False),
        ({"title":"Digital colposcopy and AI in cervical screening"}, False),
        ({"title":"Artificial intelligence and biodiversity of tropical birds"}, False),
    ]
    for item, expected in examples:
        assert relevant_to_entrepreneurs(item) is expected, item
    print("PASS: business relevance filter accepts management, HR, finance and marketing; refuses unrelated AI/youth/clinical studies")
