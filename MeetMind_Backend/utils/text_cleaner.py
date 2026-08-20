"""Utility functions for script cleaning and transcript text normalization."""

import re

DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]+')

# Common word mapping for AssemblyAI Hindi/Urdu Devanagari output -> Roman Urdu / English
DEV_WORD_MAP = {
    "भी": "bhi",
    "है": "hai",
    "हैं": "hain",
    "स्टार्ट": "start",
    "कर": "kar",
    "देंगे": "denge",
    "देंगे।": "denge.",
    "आप": "aap",
    "यह": "yeh",
    "वह": "woh",
    "क्या": "kya",
    "हम": "hum",
    "ने": "ne",
    "को": "ko",
    "का": "ka",
    "की": "ki",
    "के": "ke",
    "में": "mein",
    "से": "se",
    "पर": "par",
    "तक": "tak",
    "नहीं": "nahi",
    "हाँ": "haan",
    "हो": "ho",
    "था": "tha",
    "थी": "thi",
    "थे": "the",
    "गे": "ge",
    "गा": "ga",
    "गी": "gi",
    "सब": "sub",
    "कुछ": "kuch",
    "बात": "baat",
    "काम": "kaam",
    "टाइम": "time",
    "मीटिंग": "meeting",
    "टीम": "team",
    "कॉल": "call",
    "कोड": "code",
    "सिस्टम": "system",
    "प्रोजेक्ट": "project",
    "सब्सक्राइब": "subscribe",
    "लाइक": "like",
    "शेयर": "share",
    "करना": "karna",
    "करते": "karte",
    "किया": "kiya",
    "रहे": "rahe",
    "रहा": "raha",
    "रही": "rahi",
    "सबको": "sabko",
    "आपको": "aapko",
    "हमारे": "hamare",
    "मुझे": "mujhe",
    "ओके": "OK",
    "हेलो": "Hello",
    "सर": "Sir",
}

# Devanagari consonant and vowel mapping for phonetic transliteration
CHAR_MAP = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'z', 'झ': 'jh', 'ञ': 'nya',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    '्': '', '़': '', 'ः': ''
}


def transliterate_devanagari_word(word: str) -> str:
    """Translates a single Devanagari word into Roman Urdu or English."""
    if word in DEV_WORD_MAP:
        return DEV_WORD_MAP[word]
    
    clean_w = re.sub(r'[^\w\s]', '', word)
    if clean_w in DEV_WORD_MAP:
        return DEV_WORD_MAP[clean_w]

    res = []
    for char in word:
        if char in CHAR_MAP:
            res.append(CHAR_MAP[char])
        elif '\u0900' <= char <= '\u097F':
            continue
        else:
            res.append(char)
    return ''.join(res)


def normalize_to_roman_urdu(text: str) -> str:
    """Converts any Devanagari/Hindi text into Roman Urdu or English. Never outputs Devanagari."""
    if not text:
        return ""
    
    if not DEVANAGARI_REGEX.search(text):
        return text

    words = text.split()
    translated_words = [transliterate_devanagari_word(w) for w in words]
    res = ' '.join(translated_words)
    res = re.sub(r'\s+', ' ', res).strip()
    return res or text


def strip_devanagari(text: str) -> str:
    """Removes Devanagari script or normalizes to Roman Urdu."""
    return normalize_to_roman_urdu(text)
