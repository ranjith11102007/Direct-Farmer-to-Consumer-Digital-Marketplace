"""Search service with full-text search, typo tolerance, Tamil matching."""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Category, ListingStatus, Product, ProductListing, ProductTranslation

# Well-known Tamil produce names keyed by canonical English product name.
_TAMIL_PRODUCE: dict[str, list[str]] = {
    "tomato": ["தக்காளி", "தக்காளிக்காய்"],
    "brinjal": ["கத்தரிக்காய்", "கத்திரிக்காய்"],
    "onion": ["வெங்காயம்"],
    "potato": ["உருளைக்கிழங்கு"],
    "banana": ["வாழைப்பழம்", "வாழை"],
    "mango": ["மாம்பழம்"],
    "coconut": ["தேங்காய்"],
    "chilli": ["மிளகாய்"],
    "ginger": ["இஞ்சி"],
    "turmeric": ["மஞ்சள்"],
    "rice": ["அரிசி"],
    "lady finger": ["வெண்டைக்காய்"],
    "bottle gourd": ["சுரைக்காய்"],
    "drumstick": ["முருங்கை"],
    "spinach": ["கீரை"],
    "curry leaves": ["கருவேப்பிலை"],
    "lemon": ["எலுமிச்சை"],
    "jackfruit": ["பலாப்பழம்"],
    "guava": ["கொய்யா"],
    "pomegranate": ["மாதுளை"],
    "sapota": ["சப்போட்டா"],
    "coriander": ["கொத்தமல்லி"],
    "mint": ["புதினா"],
    "beans": ["பீன்ஸ்"],
    "carrot": ["கேரட்"],
    "cabbage": ["முட்டைக்கோஸ்"],
}

# Generated transliteration hints for common Tamil-English manglings.
_TRANSLITERATION_GROUPS: dict[str, list[str]] = {
    "takkali": ["tomato"],
    "kathirikkai": ["brinjal", "eggplant"],
    "vengayam": ["onion"],
    "urulaikizhangu": ["potato"],
    "vaazhai": ["banana"],
    "maambazham": ["mango"],
    "thengaay": ["coconut"],
    "milagai": ["chilli"],
    "inji": ["ginger"],
    "manjal": ["turmeric"],
    "arisi": ["rice"],
    "vendakkai": ["lady finger", "okra"],
    "suraikkai": ["bottle gourd"],
    "murungai": ["drumstick"],
    "keerai": ["spinach"],
    "karuveppilai": ["curry leaves"],
    "palak": ["spinach"],
}


class SearchService:
    """Powerful-ish search for product listings with typo tolerance."""

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"[^a-z0-9\u0b80-\u0bff]+", " ", text.lower()).strip()

    @staticmethod
    def _tamil_aliases(query: str) -> list[str]:
        aliases: list[str] = []
        normalized = SearchService._normalize(query)
        for canonical, tamil_names in _TAMIL_PRODUCE.items():
            for tamil_name in tamil_names:
                if tamil_name.startswith(normalized) or normalized.startswith(tamil_name[:3]):
                    aliases.append(canonical)
        translit = _TRANSLITERATION_GROUPS.get(normalized, [])
        aliases.extend(translit)
        return aliases

    @staticmethod
    def _similarity_words(query: str, candidates: list[str], threshold: float = 0.55) -> list[str]:
        q = SearchService._normalize(query)
        matches: list[tuple[float, str]] = []
        for candidate in candidates:
            c = SearchService._normalize(candidate)
            score = SequenceMatcher(None, q, c).ratio()
            if score >= threshold:
                matches.append((score, candidate))
        matches.sort(key=lambda pair: pair[0], reverse=True)
        return [word for _, word in matches[:5]]

    @staticmethod
    async def search_listings(
        db: AsyncSession,
        *,
        query: str | None = None,
        category_id: str | None = None,
        district: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        organic_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = (
            select(ProductListing)
            .join(Product)
            .join(Category)
            .where(ProductListing.status == ListingStatus.ACTIVE)
            .where(ProductListing.available_quantity > 0)
        )

        query_terms: list[str] = []
        if query:
            cleaned = SearchService._normalize(query)
            terms = cleaned.split()
            query_terms.extend(terms)

        if query:
            like_clauses: list[Any] = []
            for term in query_terms[:4]:
                like = f"%{term}%"
                like_clauses.append(Product.name.ilike(like))
                like_clauses.append(Product.name_tamil.ilike(like))
                like_clauses.append(Category.name.ilike(like))
                like_clauses.append(Category.name_tamil.ilike(like))

            aliases = SearchService._tamil_aliases(query)
            for alias in aliases[:4]:
                like_clauses.append(Product.name.ilike(f"%{alias}%"))

            if like_clauses:
                stmt = stmt.where(or_(*like_clauses))

            # Typo-tolerant fallback: if main query matches nothing, try fuzzy
            # matches against the full product name catalogue.
            sample_products = (await db.execute(select(Product.name).limit(500))).scalars().all()
            fuzzy = SearchService._similarity_words(query or "", list(sample_products))
            if fuzzy:
                stmt = stmt.where(or_(*(Product.name.ilike(f"%{f}%") for f in fuzzy)))

        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if district:
            stmt = stmt.where(ProductListing.location_district == district)
        if min_price is not None:
            stmt = stmt.where(ProductListing.price_per_unit >= float(min_price))
        if max_price is not None:
            stmt = stmt.where(ProductListing.price_per_unit <= float(max_price))
        if organic_only:
            stmt = stmt.where(ProductListing.organic_certified.is_(True))

        stmt = stmt.order_by(
            ProductListing.organic_certified.desc(),
            ProductListing.price_per_unit.asc(),
        )
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def suggest_terms(db: AsyncSession, *, prefix: str, limit: int = 8) -> list[str]:
        """Prefix autocomplete over product names (EN + TA)."""
        cleaned = SearchService._normalize(prefix)
        if not cleaned:
            return []
        like = f"%{cleaned}%"
        result = await db.execute(
            select(Product.name)
            .where(or_(Product.name.ilike(like), Product.name_tamil.ilike(like)))
            .limit(limit)
        )
        names = list(result.scalars().all())

        # Add Tamil aliases for the prefix.
        names.extend(SearchService._tamil_aliases(cleaned))
        seen: set[str] = set()
        unique: list[str] = []
        for name in names:
            if name and name not in seen:
                seen.add(name)
                unique.append(name)
        return unique[:limit]

    @staticmethod
    async def voice_query(db: AsyncSession, *, transcript: str, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        """Handle transcribed voice input (may contain filler words and Tamil)."""
        cleaned = SearchService._normalize(transcript)
        filler_removed = re.sub(
            r"\b(i want|need|give me|show me|fetch|search|please|kange|venum|thevai|ya)\b",
            " ",
            cleaned,
        )
        return await SearchService.search_listings(db, query=filler_removed.strip(), page=page, page_size=page_size)

    @staticmethod
    async def category_search(db: AsyncSession, *, category_id: str, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = (
            select(ProductListing)
            .join(Product)
            .where(
                ProductListing.status == ListingStatus.ACTIVE,
                Product.category_id == category_id,
            )
            .order_by(ProductListing.created_at.desc())
        )
        return await paginate_query(db, stmt, page=page, page_size=page_size)