#!/usr/bin/env python3
"""Roman Hinglish -> the text Sarvam speaks best.

Rules found by listening tests (2026-10-30, voice aryaman_hi_ads):
- Hindi words go to Devanagari (Sarvam's hi-IN voices read Roman Hindi worse).
- English words and every brand / proper noun STAY in Latin script: Devanagari "ज़ेप्टो" is said "zay-pto",
  Latin "Zepto" is said right.
- Digits must become words (hi-IN reads "2021" digit by digit).
Words the rules get wrong go in the pronunciation lexicon (global assets/data/lexicon.json + per-video "say:").

tokens(text) -> [{"w": original word with punctuation, "tts": [tts words], "lang": "hi"|"en"|"num"|"lex"}]
to_tts(text) -> the string sent to Sarvam
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

K = Path(__file__).resolve().parent.parent
DATA = K / "assets" / "data"
CACHE = Path(os.environ.get("YT_CACHE", Path.home() / "yt-explainers" / ".cache"))

# ── common Hindi words in Roman spelling -> Devanagari (checked by hand; beats the transliteration API) ──
HI = {
    "hai": "है", "hain": "हैं", "tha": "था", "thi": "थी", "the": "थे", "thin": "थीं", "ho": "हो", "hoga": "होगा", "hogi": "होगी", "honge": "होंगे",
    "hota": "होता", "hoti": "होती", "hote": "होते", "hua": "हुआ", "hui": "हुई", "hue": "हुए", "huye": "हुए", "reh": "रह", "rah": "रह", "rehta": "रहता", "rehti": "रहती", "rehte": "रहते", "rehna": "रहना", "rehne": "रहने", "rahta": "रहता", "rahti": "रहती", "rahte": "रहते", "rahna": "रहना", "rahne": "रहने", "raha": "रहा", "rahi": "रही", "rahe": "रहे",
    "ka": "का", "ki": "की", "ke": "के", "ko": "को", "se": "से", "me": "में", "mein": "में", "main": "मैं", "mai": "मैं", "par": "पर", "pe": "पे", "tak": "तक",
    "aur": "और", "ya": "या", "lekin": "लेकिन", "magar": "मगर", "par.": "पर", "kyunki": "क्योंकि", "isliye": "इसलिए", "toh": "तो", "to": "तो", "bhi": "भी",
    "hi": "ही", "sirf": "सिर्फ़", "bas": "बस", "na": "ना", "nahi": "नहीं", "nahin": "नहीं", "mat": "मत", "haan": "हाँ", "ji": "जी",
    "ek": "एक", "do": "दो", "teen": "तीन", "char": "चार", "chaar": "चार", "paanch": "पांच", "panch": "पांच", "chhe": "छह", "saat": "सात", "aath": "आठ",
    "nau": "नौ", "das": "दस", "sau": "सौ", "hazaar": "हज़ार", "hazar": "हज़ार", "lakh": "लाख", "crore": "करोड़", "karod": "करोड़", "karor": "करोड़",
    "yeh": "ये", "ye": "ये", "woh": "वो", "wo": "वो", "vo": "वो", "is": "इस", "us": "उस", "in": "इन", "un": "उन", "ise": "इसे", "use": "उसे", "inhe": "इन्हें",
    "unhe": "उन्हें", "iska": "इसका", "iski": "इसकी", "iske": "इसके", "uska": "उसका", "uski": "उसकी", "uske": "उसके", "inka": "इनका", "inki": "इनकी",
    "inke": "इनके", "unka": "उनका", "unki": "उनकी", "unke": "उनके", "hum": "हम", "humne": "हमने", "hamara": "हमारा", "hamari": "हमारी", "hamare": "हमारे",
    "aap": "आप", "aapka": "आपका", "aapki": "आपकी", "aapke": "आपके", "aapko": "आपको", "tum": "तुम", "mera": "मेरा", "meri": "मेरी", "mere": "मेरे",
    "mujhe": "मुझे", "hume": "हमें", "humein": "हमें", "unhone": "उन्होंने", "usne": "उसने", "isne": "इसने", "inhone": "इन्होंने", "sab": "सब", "sabhi": "सभी",
    "kya": "क्या", "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी", "kyun": "क्यों", "kyon": "क्यों", "kab": "कब", "kahan": "कहाँ", "kaun": "कौन", "kitna": "कितना",
    "kitni": "कितनी", "kitne": "कितने", "jab": "जब", "tab": "तब", "ab": "अब", "abhi": "अभी", "aaj": "आज", "kal": "कल", "phir": "फिर", "fir": "फिर",
    "jo": "जो", "jis": "जिस", "jise": "जिसे", "jiska": "जिसका", "jiski": "जिसकी", "jiske": "जिसके", "jinhone": "जिन्होंने", "agar": "अगर", "warna": "वरना",
    "kar": "कर", "karna": "करना", "karta": "करता", "karti": "करती", "karte": "करते", "kiya": "किया", "kiye": "किए", "ki.": "की", "karke": "करके", "kare": "करे",
    "karo": "करो", "karein": "करें", "karenge": "करेंगे", "karega": "करेगा", "diya": "दिया", "di": "दी", "diye": "दिए", "dena": "देना", "deta": "देता", "deti": "देती",
    "dete": "देते", "lena": "लेना", "liya": "लिया", "li": "ली", "liye": "लिए", "leta": "लेता", "leti": "लेती", "lete": "लेते", "gaya": "गया", "gayi": "गई",
    "gaye": "गए", "jaata": "जाता", "jata": "जाता", "jaati": "जाती", "jati": "जाती", "jaate": "जाते", "jate": "जाते", "jaa": "जा", "ja": "जा", "aaya": "आया",
    "aayi": "आई", "aaye": "आए", "aata": "आता", "aati": "आती", "aate": "आते", "sakta": "सकता", "sakti": "सकती", "sakte": "सकते", "saka": "सका", "paya": "पाया",
    "chahiye": "चाहिए", "chahta": "चाहता", "chahte": "चाहते", "lagta": "लगता", "lagti": "लगती", "lagte": "लगते", "laga": "लगा", "lagi": "लगी", "bana": "बना",
    "banaya": "बनाया", "banayi": "बनाई", "bani": "बनी", "bane": "बने", "banta": "बनता", "banti": "बनती", "rakha": "रखा", "rakhi": "रखी", "rakhe": "रखे",
    "dekha": "देखा", "dekho": "देखो", "dekhiye": "देखिए", "dekhte": "देखते", "socho": "सोचो", "sochiye": "सोचिए", "samjho": "समझो", "samjhiye": "समझिए",
    "bola": "बोला", "boli": "बोली", "bole": "बोले", "kaha": "कहा", "kehte": "कहते", "kehta": "कहता", "pata": "पता", "matlab": "मतलब", "yaani": "यानी",
    "bahut": "बहुत", "zyada": "ज़्यादा", "jyada": "ज़्यादा", "kam": "कम", "thoda": "थोड़ा", "thodi": "थोड़ी", "bada": "बड़ा", "badi": "बड़ी", "bade": "बड़े",
    "chhota": "छोटा", "chhoti": "छोटी", "chhote": "छोटे", "naya": "नया", "nayi": "नई", "naye": "नए", "purana": "पुराना", "purani": "पुरानी", "pehla": "पहला",
    "pehli": "पहली", "pehle": "पहले", "dusra": "दूसरा", "doosra": "दूसरा", "dusri": "दूसरी", "teesra": "तीसरा", "aakhir": "आख़िर", "akhir": "आख़िर", "baad": "बाद",
    "saal": "साल", "din": "दिन", "mahine": "महीने", "mahina": "महीना", "ghante": "घंटे", "waqt": "वक़्त", "samay": "समय", "log": "लोग", "logon": "लोगों",
    "logo": "लोगों", "paisa": "पैसा", "paise": "पैसे", "rupaye": "रुपये", "rupaya": "रुपया", "rupee": "रुपये", "kaam": "काम", "baat": "बात", "baatein": "बातें",
    "sawaal": "सवाल", "sawal": "सवाल", "jawab": "जवाब", "jawaab": "जवाब", "duniya": "दुनिया", "desh": "देश", "sheher": "शहर", "shehar": "शहर", "ghar": "घर",
    "dukaan": "दुकान", "dukan": "दुकान", "grahak": "ग्राहक", "kahani": "कहानी", "sach": "सच", "galat": "ग़लत", "sahi": "सही", "asli": "असली", "pura": "पूरा",
    "puri": "पूरी", "poora": "पूरा", "poori": "पूरी", "khud": "ख़ुद", "saath": "साथ", "sath": "साथ", "bina": "बिना", "andar": "अंदर", "bahar": "बाहर",
    "upar": "ऊपर", "neeche": "नीचे", "niche": "नीचे", "aage": "आगे", "peeche": "पीछे", "beech": "बीच", "taraf": "तरफ़", "jaise": "जैसे", "jaisa": "जैसा",
    "waise": "वैसे", "aisa": "ऐसा", "aisi": "ऐसी", "aise": "ऐसे", "itna": "इतना", "itni": "इतनी", "itne": "इतने", "utna": "उतना", "lagbhag": "लगभग",
    "shayad": "शायद", "zaroor": "ज़रूर", "bilkul": "बिल्कुल", "sabse": "सबसे", "hamesha": "हमेशा", "kabhi": "कभी", "kuch": "कुछ", "koi": "कोई", "har": "हर",
    "dono": "दोनों", "donon": "दोनों", "wahi": "वही", "yahi": "यही", "wahan": "वहाँ", "yahan": "यहाँ", "ghaata": "घाटा", "ghaate": "घाटे", "munafa": "मुनाफ़ा",
    "faayda": "फ़ायदा", "fayda": "फ़ायदा", "nuksaan": "नुकसान", "nuksan": "नुकसान", "kamai": "कमाई", "kamaya": "कमाया", "kharch": "खर्च", "kharcha": "खर्चा",
    "bazaar": "बाज़ार", "bazar": "बाज़ार", "kimat": "कीमत", "keemat": "कीमत", "sasta": "सस्ता", "sasti": "सस्ती", "mehenga": "महंगा", "mehngi": "महंगी",
    "jeet": "जीत", "jeeta": "जीता", "jeet.": "जीत", "haar": "हार", "haara": "हारा", "khel": "खेल", "soch": "सोच", "dimaag": "दिमाग़", "sapna": "सपना",
    "pagal": "पागल", "zaruri": "ज़रूरी", "zaroori": "ज़रूरी", "mushkil": "मुश्किल", "aasaan": "आसान", "asaan": "आसान", "tez": "तेज़", "dheere": "धीरे",
    "jaldi": "जल्दी", "seedha": "सीधा", "seedhi": "सीधी", "achha": "अच्छा", "accha": "अच्छा", "acchi": "अच्छी", "achhi": "अच्छी", "bura": "बुरा", "buri": "बुरी",
    "hissa": "हिस्सा", "tarika": "तरीका", "tareeka": "तरीका", "wajah": "वजह", "kaaran": "कारण", "nateeja": "नतीजा", "natija": "नतीजा", "chalo": "चलो",
    "chaliye": "चलिए", "samajhte": "समझते", "jaante": "जानते", "jante": "जानते", "jaanna": "जानना", "suniye": "सुनिए", "dosto": "दोस्तों", "doston": "दोस्तों",
    "sa": "सा", "si": "सी", "ne": "ने", "wala": "वाला", "wali": "वाली", "wale": "वाले", "waala": "वाला", "waali": "वाली", "waale": "वाले",
    "taaki": "ताकि", "chhupa": "छुपा", "chupa": "छुपा", "nazar": "नज़र", "sauda": "सौदा", "badla": "बदला", "badal": "बदल", "badalta": "बदलता",
    "yaar": "यार", "bhai": "भाई", "arre": "अरे", "are": "अरे", "acha": "अच्छा", "hazaron": "हज़ारों", "lakhon": "लाखों", "croron": "करोड़ों", "karodon": "करोड़ों",
}
# more everyday Hinglish (business-explainer vocabulary); hand-checked, beats the transliteration API
HI.update({
    "bees": "बीस", "tees": "तीस", "chalis": "चालीस", "chaalis": "चालीस", "pachaas": "पचास", "pachas": "पचास", "sattar": "सत्तर", "assi": "अस्सी",
    "nabbe": "नब्बे", "gyarah": "ग्यारह", "barah": "बारह", "pandrah": "पंद्रह", "dedh": "डेढ़", "dhai": "ढाई", "sawa": "सवा", "saadhe": "साढ़े",
    "aadha": "आधा", "adha": "आधा", "aadhi": "आधी", "doguna": "दोगुना", "dugna": "दोगुना", "chauthai": "चौथाई", "navaasi": "नवासी",
    "kya": "क्या", "kyun": "क्यों", "kyon": "क्यों", "kaisa": "कैसा", "kaisi": "कैसी", "kahan": "कहाँ", "kab": "कब", "kaun": "कौन", "kis": "किस",
    "kisne": "किसने", "kisi": "किसी", "kisko": "किसको", "kitna": "कितना", "balki": "बल्कि", "tabhi": "तभी", "jabki": "जबकि", "isiliye": "इसीलिए",
    "asal": "असल", "darasal": "दरअसल", "haalaanki": "हालांकि", "halanki": "हालांकि", "achanak": "अचानक", "turant": "तुरंत", "foran": "फ़ौरन",
    "der": "देर", "baar": "बार", "baaki": "बाकी", "baki": "बाकी", "kayi": "कई", "kai": "कई", "zyadatar": "ज़्यादातर", "zyaadatar": "ज़्यादातर",
    "kareeb": "करीब", "kareeban": "करीबन", "takreeban": "तकरीबन", "apna": "अपना", "apni": "अपनी", "apne": "अपने", "sabka": "सबका", "sabko": "सबको",
    "sabki": "सबकी", "sabke": "सबके", "kuchh": "कुछ", "kaafi": "काफ़ी", "kafi": "काफ़ी", "keval": "केवल", "kewal": "केवल", "aakhirkar": "आख़िरकार",
    "akhirkar": "आख़िरकार", "vaise": "वैसे", "yaa": "या", "wapas": "वापस", "vapas": "वापस", "parso": "परसों", "baad": "बाद", "paas": "पास",
    "kamana": "कमाना", "kamate": "कमाते", "kamata": "कमाता", "kamati": "कमाती", "kamaye": "कमाए", "kamaayi": "कमाई", "gawana": "गंवाना",
    "gawate": "गंवाते", "gawaya": "गंवाया", "gawa": "गंवा", "ganwa": "गंवा", "ganwate": "गंवाते", "ganwaya": "गंवाया", "ganwana": "गंवाना",
    "khona": "खोना", "khoya": "खोया", "khoyi": "खोई", "khote": "खोते", "keh": "कह", "kehna": "कहना", "kehti": "कहती", "kehne": "कहने",
    "kaho": "कहो", "kahiye": "कहिए", "kahi": "कही", "kahe": "कहे", "samjhenge": "समझेंगे", "samjhe": "समझे", "samajh": "समझ", "samajhna": "समझना",
    "samjhaate": "समझाते", "samjhata": "समझाता", "samjhana": "समझाना", "nikal": "निकल", "nikla": "निकला", "nikli": "निकली", "nikle": "निकले",
    "nikalna": "निकलना", "nikalta": "निकलता", "nikalti": "निकलती", "nikalte": "निकलते", "nikala": "निकाला", "nikali": "निकाली", "nikale": "निकाले",
    "dikhta": "दिखता", "dikhti": "दिखती", "dikhte": "दिखते", "dikha": "दिखा", "dikhi": "दिखी", "dikhe": "दिखे", "dikhaya": "दिखाया",
    "dikhata": "दिखाता", "dikhana": "दिखाना", "dikhai": "दिखाई", "bolega": "बोलेगा", "bolta": "बोलता", "bolti": "बोलती", "bolte": "बोलते",
    "bolna": "बोलना", "shuruaat": "शुरुआत", "shuruat": "शुरुआत", "shuru": "शुरू", "farak": "फ़र्क", "fark": "फ़र्क", "farq": "फ़र्क",
    "baadh": "बाढ़", "poore": "पूरे", "purane": "पुराने", "puraane": "पुराने", "kijiye": "कीजिए", "kariye": "करिए", "dijiye": "दीजिए",
    "lijiye": "लीजिए", "shehron": "शहरों", "shehro": "शहरों", "gaon": "गांव", "gaanv": "गांव", "kasba": "कस्बा", "sabak": "सबक", "seekh": "सीख",
    "sikh": "सीख", "seekha": "सीखा", "sikha": "सीखा", "seekhna": "सीखना", "aa": "आ", "aana": "आना", "aaega": "आएगा", "aayega": "आएगा",
    "aayegi": "आएगी", "aaenge": "आएंगे", "kamyaabi": "कामयाबी", "kamyabi": "कामयाबी", "safalta": "सफलता", "safar": "सफ़र", "sapne": "सपने",
    "mehnat": "मेहनत", "bharosa": "भरोसा", "vishwas": "विश्वास", "imaandari": "ईमानदारी", "zimmedari": "ज़िम्मेदारी", "faisla": "फ़ैसला",
    "faisle": "फ़ैसले", "ladai": "लड़ाई", "jung": "जंग", "takkar": "टक्कर", "muqabla": "मुक़ाबला", "mukabla": "मुक़ाबला", "khiladi": "खिलाड़ी",
    "khiladiyon": "खिलाड़ियों", "maalik": "मालिक", "malik": "मालिक", "naukri": "नौकरी", "kisaan": "किसान", "kisan": "किसान",
    "dukaandaar": "दुकानदार", "dukandar": "दुकानदार", "vyapaar": "व्यापार", "vyapar": "व्यापार", "dhandha": "धंधा", "dhanda": "धंधा",
    "karobaar": "कारोबार", "sarkaar": "सरकार", "sarkar": "सरकार", "kanoon": "कानून", "niyam": "नियम", "aam": "आम", "aadmi": "आदमी",
    "insaan": "इंसान", "parivaar": "परिवार", "parivar": "परिवार", "shaadi": "शादी", "bachche": "बच्चे", "bacche": "बच्चे", "maa": "माँ",
    "zindagi": "ज़िंदगी", "mulk": "मुल्क", "rajya": "राज्य", "sadak": "सड़क", "raasta": "रास्ता", "rasta": "रास्ता", "gaadi": "गाड़ी", "gadi": "गाड़ी",
    "cheez": "चीज़", "cheezein": "चीज़ें", "cheezon": "चीज़ों", "saamaan": "सामान", "saman": "सामान", "maal": "माल", "daam": "दाम", "daamon": "दामों",
    "laagat": "लागत", "lagat": "लागत", "kharche": "खर्चे", "kharchon": "खर्चों", "aamdani": "आमदनी", "munafe": "मुनाफ़े", "karz": "कर्ज़",
    "karza": "कर्ज़ा", "udhaar": "उधार", "bachat": "बचत", "nivesh": "निवेश", "hissedari": "हिस्सेदारी", "hisse": "हिस्से", "hisaab": "हिसाब",
    "hisab": "हिसाब", "aankde": "आंकड़े", "ankde": "आंकड़े", "jugaad": "जुगाड़", "jugad": "जुगाड़", "raaz": "राज़", "jhooth": "झूठ",
    "galti": "ग़लती", "galtiyan": "ग़लतियाँ", "khatra": "ख़तरा", "khatre": "ख़तरे", "dar": "डर", "umeed": "उम्मीद", "ummeed": "उम्मीद",
    "iraada": "इरादा", "maqsad": "मक़सद", "tarakki": "तरक्की", "badhat": "बढ़त", "giravat": "गिरावट", "girawat": "गिरावट", "uchaal": "उछाल",
    "chhalang": "छलांग", "raftaar": "रफ़्तार", "raftar": "रफ़्तार", "zor": "ज़ोर", "taakat": "ताक़त", "takat": "ताक़त", "kamzori": "कमज़ोरी",
    "mauka": "मौका", "mauke": "मौके", "daur": "दौर", "zamana": "ज़माना", "zamane": "ज़माने", "shuruati": "शुरुआती", "aakhri": "आख़िरी",
    "akhri": "आख़िरी", "agla": "अगला", "agli": "अगली", "agle": "अगले", "pichhla": "पिछला", "pichhle": "पिछले", "pichhli": "पिछली",
    "pichle": "पिछले", "pichla": "पिछला", "pichhe": "पीछे", "badhiya": "बढ़िया", "behtar": "बेहतर", "behtareen": "बेहतरीन", "kharab": "ख़राब",
    "khaas": "ख़ास", "khas": "ख़ास", "alag": "अलग", "ajeeb": "अजीब", "anokha": "अनोखा", "hairaan": "हैरान", "hairan": "हैरान",
    "mumkin": "मुमकिन", "namumkin": "नामुमकिन", "zabardast": "ज़बरदस्त", "bhaari": "भारी", "bhari": "भारी", "halka": "हल्का", "lamba": "लंबा",
    "lambi": "लंबी", "lambe": "लंबे", "gehra": "गहरा", "saaf": "साफ़", "mehenge": "महंगे", "mehnga": "महंगा", "saste": "सस्ते", "ameer": "अमीर",
    "amir": "अमीर", "gareeb": "गरीब", "garib": "गरीब", "majboor": "मजबूर", "mazboot": "मज़बूत", "majboot": "मज़बूत", "kamzor": "कमज़ोर",
    "taaza": "ताज़ा", "khush": "ख़ुश", "pareshan": "परेशान", "pareshaan": "परेशान", "badha": "बढ़ा", "badhi": "बढ़ी", "badhe": "बढ़े",
    "badhta": "बढ़ता", "badhti": "बढ़ती", "badhte": "बढ़ते", "badhna": "बढ़ना", "badhaya": "बढ़ाया", "badhane": "बढ़ाने", "badhana": "बढ़ाना",
    "gira": "गिरा", "giri": "गिरी", "gire": "गिरे", "girta": "गिरता", "girne": "गिरने", "ghata": "घटा", "ghati": "घटी", "chala": "चला",
    "chali": "चली", "chale": "चले", "chalta": "चलता", "chalti": "चलती", "chalte": "चलते", "chalana": "चलाना", "chalaya": "चलाया",
    "chalate": "चलाते", "khola": "खोला", "kholi": "खोली", "khole": "खोले", "kholna": "खोलना", "khareeda": "ख़रीदा", "kharida": "ख़रीदा",
    "kharidne": "ख़रीदने", "khareedne": "ख़रीदने", "kharidte": "ख़रीदते", "khareedte": "ख़रीदते", "becha": "बेचा", "bechi": "बेची", "beche": "बेचे",
    "bechna": "बेचना", "bechte": "बेचते", "bechta": "बेचता", "bechne": "बेचने", "mila": "मिला", "mili": "मिली", "milta": "मिलता", "milti": "मिलती",
    "milte": "मिलते", "milna": "मिलना", "milega": "मिलेगा", "milegi": "मिलेगी", "milenge": "मिलेंगे", "pahuncha": "पहुंचा", "pahunchi": "पहुंची",
    "pahunche": "पहुंचे", "pahunchna": "पहुंचना", "pahunchane": "पहुंचाने", "bacha": "बचा", "bachi": "बची", "bache": "बचे", "bachana": "बचाना",
    "bachaya": "बचाया", "bachane": "बचाने", "jeete": "जीते", "jeetna": "जीतना", "haare": "हारे", "haarna": "हारना", "toda": "तोड़ा", "todi": "तोड़ी",
    "tode": "तोड़े", "todna": "तोड़ना", "tod": "तोड़", "joda": "जोड़ा", "jode": "जोड़े", "jodna": "जोड़ना", "jod": "जोड़", "sochte": "सोचते",
    "sochta": "सोचता", "sochna": "सोचना", "lage": "लगे", "lagaya": "लगाया", "lagayi": "लगाई", "lagaye": "लगाए", "lagana": "लगाना",
    "lagate": "लगाते", "lagata": "लगाता", "dikkat": "दिक्कत", "uthaya": "उठाया", "uthaye": "उठाए", "uthana": "उठाना", "utha": "उठा",
    "ruka": "रुका", "ruki": "रुकी", "ruke": "रुके", "rukna": "रुकना", "rok": "रोक", "roka": "रोका", "rokne": "रोकने", "chhoda": "छोड़ा",
    "chhodi": "छोड़ी", "chhode": "छोड़े", "chhodna": "छोड़ना", "chhod": "छोड़", "pakda": "पकड़ा", "pakdi": "पकड़ी", "pakad": "पकड़",
    "maante": "मानते", "maanta": "मानता", "maan": "मान", "jaanta": "जानता", "jaanti": "जानती", "chuka": "चुका", "chuki": "चुकी", "chuke": "चुके",
    "paana": "पाना", "paaya": "पाया", "paate": "पाते", "paata": "पाता", "paati": "पाती", "paaye": "पाए", "rakhna": "रखना", "rakhta": "रखता",
    "rakhte": "रखते", "rakho": "रखो", "bata": "बता", "bataya": "बताया", "batata": "बताता", "batate": "बताते", "batana": "बताना", "batayi": "बताई",
    "puchha": "पूछा", "poocha": "पूछा", "puchhte": "पूछते", "poochte": "पूछते", "suna": "सुना", "sunte": "सुनते", "chahe": "चाहे", "chaha": "चाहा",
    "chahti": "चाहती", "chahenge": "चाहेंगे", "hoke": "होके", "hokar": "होकर", "banake": "बनाके", "banakar": "बनाकर", "banane": "बनाने",
    "banate": "बनाते", "banata": "बनाता", "banaye": "बनाए", "jud": "जुड़", "jude": "जुड़े", "juda": "जुड़ा", "judi": "जुड़ी", "judna": "जुड़ना",
    "ghoom": "घूम", "ghoomta": "घूमता", "ghumta": "घूमता", "ghoomti": "घूमती", "ghoomte": "घूमते", "laut": "लौट", "lauta": "लौटा",
    "lautaya": "लौटाया", "maanga": "मांगा", "maangte": "मांगते", "mangte": "मांगते", "de": "दे", "dega": "देगा", "degi": "देगी", "denge": "देंगे",
    "dene": "देने", "le": "ले", "lega": "लेगा", "legi": "लेगी", "lenge": "लेंगे", "lene": "लेने", "hona": "होना", "hone": "होने", "raho": "रहो",
    "rahega": "रहेगा", "rahegi": "रहेगी", "rahenge": "रहेंगे", "jaayega": "जाएगा", "jayega": "जाएगा", "jaayegi": "जाएगी", "jayegi": "जाएगी",
    "jaayenge": "जाएंगे", "jayenge": "जाएंगे", "jaenge": "जाएंगे", "jaane": "जाने", "sakenge": "सकेंगे", "sakega": "सकेगा", "padta": "पड़ता",
    "padti": "पड़ती", "padte": "पड़ते", "pada": "पड़ा", "padi": "पड़ी", "pade": "पड़े", "padega": "पड़ेगा", "padegi": "पड़ेगी",
    "mile": "मिले", "door": "दूर", "sun": "सुन", "man": "मन", "ban": "बन", "bana": "बना",
})
# Roman words that are ALSO everyday English words. Hinglish means Hindi far more often, so these are Hindi unless they sit
# inside English (English on both sides, numbers count as their other neighbour) or a word rule below says otherwise.
AMBIG = {"do", "the", "to", "is", "us", "in", "un", "main", "me", "use", "are", "ban", "log", "mile", "door", "sun", "man"}
# short English words Hinglish writers use as-is (too short for the English frequency list)
EN_SHORT = {"ad", "app", "vs", "ok", "id", "ui", "ux", "ai", "tv", "pc", "hr", "pr", "ca"}
# "ban" is Hindi बन before these, English "ban" (prohibition) next to the others
BAN_HI = {"gaya", "gayi", "gaye", "jaata", "jata", "jaati", "jati", "jaate", "jate", "jaaye", "jaye", "jaayega", "jayega", "jaenge", "jaayenge",
          "sakta", "sakti", "sakte", "raha", "rahi", "rahe", "chuka", "chuki", "chuke", "ke", "kar", "na", "jaana", "jaane", "paaya", "paya", "payi"}
BAN_EN = {"laga", "lagaya", "lagayi", "lagaa", "lag", "lagi", "lagega", "lagne", "lagana", "hai", "hua", "hui", "kiya", "kiye", "karna", "karne", "karte"}

ONES = ("शून्य एक दो तीन चार पांच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस "
        "पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस "
        "तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरेपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ "
        "इकसठ बासठ तिरेसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर "
        "उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे "
        "छियानवे सत्तानवे अट्ठानवे निन्यानवे").split()
assert len(ONES) == 100


def num_words(n):
    """Indian-system cardinal in Hindi words: 41000 -> इकतालीस हज़ार, 12500000 -> एक करोड़ पच्चीस लाख."""
    n = int(n)
    if n < 100:
        return ONES[n]
    out = []
    for size, word in ((10 ** 7, "करोड़"), (10 ** 5, "लाख"), (1000, "हज़ार"), (100, "सौ")):
        if n >= size:
            out += [num_words(n // size), word]
            n %= size
    if n:
        out.append(ONES[n])
    return " ".join(out)


def year_words(n):
    if 2000 <= n <= 2099:
        return "दो हज़ार" + (" " + ONES[n - 2000] if n > 2000 else "")
    return ONES[n // 100] + " सौ" + (" " + ONES[n % 100] if n % 100 else "")


def decimal_words(s):
    whole, frac = s.split(".")
    w = int(whole)
    if frac == "5":
        if w == 1:
            return "डेढ़"
        if w == 2:
            return "ढाई"
        if w >= 3:
            return "साढ़े " + num_words(w)
    if frac == "25" and w >= 1:
        return "सवा " + num_words(w)
    return num_words(w) + " पॉइंट " + " ".join(ONES[int(c)] for c in frac)


SCALE = {"k": "हज़ार", "thousand": "हज़ार", "hazaar": "हज़ार", "l": "लाख", "lakh": "लाख", "lac": "लाख", "cr": "करोड़", "crore": "करोड़",
         "crores": "करोड़", "bn": "billion", "b": "billion", "billion": "billion", "mn": "million", "m": "million", "million": "million",
         "tn": "trillion", "trillion": "trillion"}
NUM_RE = re.compile(r"^([₹$€£]?)(\d[\d,]*(?:\.\d+)?)(%|x|X|k|K|L|Cr|cr|Bn|bn|B|Mn|mn|M|Tn|tn|st|nd|rd|th)?$")


def number_tts(tok, nxt):
    """'₹41,000' 'Cr' -> (['इकतालीस', 'हज़ार', 'करोड़', 'रुपये'], consumed_next) ; '2021' -> year ; '62%' -> 'बासठ परसेंट'."""
    m = NUM_RE.match(tok)
    if not m:
        return None, False
    cur, digits, suf = m.groups()
    raw = digits.replace(",", "")
    used_next = False
    scale = None
    if suf and suf.lower() in SCALE:
        scale = SCALE[suf.lower()]
    elif nxt and nxt.lower().strip(".,?!;:") in SCALE and not suf:
        scale = SCALE[nxt.lower().strip(".,?!;:")]
        used_next = True
    if suf in ("st", "nd", "rd", "th"):
        return [tok], False  # ordinals stay English ("1st" is read fine)
    if "." in raw:
        words = decimal_words(raw)
    elif not cur and not scale and suf is None and "," not in digits and len(raw) == 4 and 1100 <= int(raw) <= 2099:
        words = year_words(int(raw))
    else:
        words = num_words(int(raw))
    out = words.split()
    if scale:
        out.append(scale)
    if suf == "%":
        out.append("परसेंट")
    elif suf in ("x", "X"):
        out.append("गुना")
    if cur == "₹":
        out.append("रुपये")
    elif cur == "$":
        out.append("dollars")
    elif cur == "€":
        out.append("euros")
    elif cur == "£":
        out.append("pounds")
    return out, used_next


_eng = None


def english():
    global _eng
    if _eng is None:
        _eng = {w.strip() for w in (DATA / "english-20k.txt").read_text().splitlines() if len(w.strip()) > 2 or w.strip() in ("a", "i", "an", "on", "of", "at", "by", "or", "if", "it", "up", "we", "my", "no", "so", "go", "be", "he", "am", "as", "tv", "ai", "ok")}
        _eng -= set(HI) - AMBIG  # junk in the frequency list ("hai", "ki", "se")
    return _eng


_big = None


def is_english(low, eng):
    global _big
    if low in eng or "-" in low and all(p in eng for p in low.split("-")):
        return True
    for suf, add in (("s", ""), ("es", ""), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"), ("ly", ""), ("ers", ""), ("er", "")):
        if low.endswith(suf) and len(low) - len(suf) >= 3 and low[: -len(suf)] + add in eng:
            return True
    if len(low) >= 6:  # long words: the system dictionary (short entries there collide with Roman Hindi)
        if _big is None:
            d = Path("/usr/share/dict/words")
            _big = {w.strip().lower() for w in d.read_text().splitlines()} if d.exists() else set()
        stem = low[:-1] if low.endswith("s") else low
        return low in _big or stem in _big
    return False


def lexicon(extra=None):
    lex = {}
    p = DATA / "lexicon.json"
    if p.exists():
        lex.update({k.lower(): v for k, v in json.loads(p.read_text()).items() if not k.startswith("_")})
    if extra:
        lex.update({k.lower(): v for k, v in extra.items()})
    return lex


def _key():
    if os.environ.get("SARVAM_API_KEY"):
        return os.environ["SARVAM_API_KEY"].strip()
    for env in [Path.cwd() / ".env", Path.home() / "yt-explainers" / ".env", Path.home() / "insta-reel" / ".env", Path.home() / "stick-reel" / ".env"]:
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("SARVAM_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"')
    sys.exit("SARVAM_API_KEY not found (env var, ./.env or ~/yt-explainers/.env)")


def translit(words):
    """Roman Hindi words -> Devanagari via Sarvam /transliterate, cached on disk word by word."""
    CACHE.mkdir(parents=True, exist_ok=True)
    cp = CACHE / "translit.json"
    cache = json.loads(cp.read_text()) if cp.exists() else {}
    todo = [w for w in dict.fromkeys(words) if w.lower() not in cache]
    for i in range(0, len(todo), 40):
        chunk = todo[i:i + 40]
        body = json.dumps({"input": " ".join(chunk), "source_language_code": "en-IN", "target_language_code": "hi-IN", "spoken_form": False}).encode()
        req = urllib.request.Request("https://api.sarvam.ai/transliterate", data=body, headers={"api-subscription-key": _key(), "Content-Type": "application/json"})
        out = json.loads(urllib.request.urlopen(req, timeout=60).read())["transliterated_text"].split()
        if len(out) != len(chunk):  # the API merged or split something: fall back to one word per call
            out = []
            for w in chunk:
                b = json.dumps({"input": w, "source_language_code": "en-IN", "target_language_code": "hi-IN", "spoken_form": False}).encode()
                r = urllib.request.Request("https://api.sarvam.ai/transliterate", data=b, headers={"api-subscription-key": _key(), "Content-Type": "application/json"})
                out.append(json.loads(urllib.request.urlopen(r, timeout=60).read())["transliterated_text"].strip())
        for w, d in zip(chunk, out):
            cache[w.lower()] = d
    cp.write_text(json.dumps(cache, ensure_ascii=False, indent=0))
    return [cache[w.lower()] for w in words]


WORD_RE = re.compile(r"^([\"'“‘(\[]*)(.*?)([\"'”’)\].,!?;:…]*)$")


def tokens(text, extra_lex=None, online=True):
    """Classify every word. Keyword marks (*word*) are removed here; the caller keeps the display text."""
    text = text.replace("*", "")
    raw = text.split()
    eng, lex = english(), lexicon(extra_lex)
    toks = []
    i = 0
    while i < len(raw):
        w = raw[i]
        pre, core, post = WORD_RE.match(w).groups()
        nxt = raw[i + 1] if i + 1 < len(raw) else ""
        t = {"w": w, "core": core, "post": post}
        low = core.lower()
        if low in lex:
            t.update(lang="lex", tts=lex[low].split())
        elif re.match(r"^[₹$€£]?\d", core):
            parts = re.split(r"(?<=\d)-(?=\d)", core)  # "2-3" -> two numbers with "से"
            out, used = [], False
            for j, p in enumerate(parts):
                o, u = number_tts(p, nxt if j == len(parts) - 1 else "")
                out += (o or [p]) + (["से"] if j < len(parts) - 1 else [])
                used = used or u
            t.update(lang="num", tts=out)
            if used:  # the scale word ("Cr", "billion") is folded in
                t["w"] = w + " " + nxt
                t["post"] = WORD_RE.match(nxt).group(3)
                i += 1
        elif re.search(r"[ऀ-ॿ]", core):
            t.update(lang="hi", tts=[core])
        elif not core:
            t.update(lang="en", tts=[])
        elif core.isupper() and len(core) > 1 or (core[0].isupper() and i > 0 and not raw[i - 1].endswith((".", "?", "!"))):
            t.update(lang="en", tts=[core])  # acronym or proper noun mid-sentence: always Latin
        elif low in EN_SHORT or low.rstrip("s") in EN_SHORT and len(low) > 2:
            t.update(lang="en", tts=[core])
        elif low in HI and low not in AMBIG:
            t.update(lang="hi", tts=[HI[low]])
        elif low in AMBIG:
            t.update(lang="?", tts=[core])
        elif is_english(low, eng):
            t.update(lang="en", tts=[core])
        elif core[0].isupper():  # sentence-initial capitalised word that is neither known Hindi nor English: a name
            t.update(lang="en", tts=[core])
        else:
            t.update(lang="hi?", tts=[core])  # unknown Roman word: treat as Hindi, transliterate
        toks.append(t)
        i += 1
    # ambiguous words: Hindi unless surrounded by English (see AMBIG)
    def side(k, d):
        j = k + d
        if j < 0 or j >= len(toks):
            return None
        if d < 0 and re.search(r"[.?!।]$", toks[j]["post"] or "") or d > 0 and re.search(r"[.?!।,;:]$", toks[k]["post"] or ""):
            return None  # don't look across sentence ends / commas
        return toks[j]["lang"]
    for k, t in enumerate(toks):
        if t["lang"] != "?":
            continue
        low = t["core"].lower()
        p, n = side(k, -1), side(k, 1)
        p, n = (n if p == "num" else p), (p if n == "num" else n)
        nx = toks[k + 1]["core"].lower() if k + 1 < len(toks) else ""
        nx2 = toks[k + 2]["core"].lower() if k + 2 < len(toks) else ""
        pv = toks[k - 1]["core"].lower() if k else ""
        en = p == "en" and n == "en"
        if low == "do":  # Hinglish writers say "karo" for English "do": "do" is almost always the number two
            en = nx in {"not", "you", "it", "this", "that", "we", "they", "a", "an", "so", "what", "more", "something", "anything", "nothing", "well"}
        elif low == "the":  # English "the" sits before an English noun; Hindi "थे" ends a clause ("market mein the, toh")
            en = n == "en" and not t["post"]
        elif low == "main":  # "iska main reason" vs "main bataunga"
            en = n == "en" and not toks[k + 1]["core"][:1].isupper()
        elif low == "use":  # "use karte hain" = English use; "use pata tha" = उसे
            en = nx.startswith(("kar", "kiy", "hot", "hon", "case")) or en
        elif low == "ban":
            en = (nx in BAN_EN or pv in {"pe", "par", "ka", "ki", "ko", "ek", "yeh", "ye", "is", "poora", "pura"} or en) and not (nx in BAN_HI and not (nx == "kar" and nx2.startswith(("di", "de", "do"))))
            if nx == "kar" and nx2.startswith(("di", "de", "do")):
                en = True
        elif low == "log":
            en = nx in {"in", "out", "kiya", "karo", "karte", "karna", "file"} or en
        elif low == "mile":
            en = toks[k - 1]["lang"] == "num" if k else False
        if not en and low in HI:
            t.update(lang="hi", tts=[HI[low]])
        else:
            t["lang"] = "en"
    KI_AFTER = {"hai", "tha", "thi", "the", "kaha", "bola", "bole", "socha", "lagta", "pata", "matlab", "yeh", "ye", "taaki", "hain", "dekha", "samjha", "maana"}
    for k, t in enumerate(toks):
        if t["core"].lower() == "ki" and k and (toks[k - 1]["post"].startswith(",") or toks[k - 1]["core"].lower() in KI_AFTER):
            t["tts"] = ["कि"]
    unknown = [t["core"] for t in toks if t["lang"] == "hi?"]
    if unknown and online:
        for t, d in zip([t for t in toks if t["lang"] == "hi?"], translit(unknown)):
            t["tts"] = [d]
    for t in toks:  # keep the sentence punctuation on the last spoken word (pauses, question intonation)
        if t["tts"] and t["post"]:
            p = t["post"].replace("…", "...")
            p = "".join(c for c in p if c in ".,!?;:")
            if p:
                t["tts"][-1] += "।" if p == "." and t["lang"] in ("hi", "hi?", "num") else p
    return toks


def to_tts(text, extra_lex=None):
    return " ".join(w for t in tokens(text, extra_lex) for w in t["tts"])


if __name__ == "__main__":
    s = " ".join(sys.argv[1:]) or "2021 mein Zepto sirf ek chhota sa startup tha. Aaj iski valuation $5 bn hai aur FY24 mein ₹41,000 Cr ka loss, 62% growth, 2.5 saal."
    for t in tokens(s):
        print(f"{t['lang']:4} {t['w']:<16} {' '.join(t['tts'])}")
    print(to_tts(s))
