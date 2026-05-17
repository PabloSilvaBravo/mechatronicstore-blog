"""
Seed inicial de las 10 sources Tier 1+2 del blog.
Idempotente: INSERT OR REPLACE.
"""
import db

SOURCES = [
    # Tier 1
    {"id": "instructables", "name": "Instructables",
     "feed_url": "https://www.instructables.com/howto/rss/",
     "homepage": "https://www.instructables.com/",
     "parser_id": "instructables", "tier": 1},
    {"id": "hackaday-howto", "name": "Hackaday How-Tos",
     "feed_url": "https://hackaday.com/category/how-to/feed/",
     "homepage": "https://hackaday.com/category/how-to/",
     "parser_id": "generic_rss", "tier": 1},
    {"id": "adafruit-learn", "name": "Adafruit Learn",
     "feed_url": "https://learn.adafruit.com/feed",
     "homepage": "https://learn.adafruit.com/",
     "parser_id": "adafruit_learn", "tier": 1},
    {"id": "sparkfun-tutorials", "name": "SparkFun Tutorials",
     "feed_url": "https://www.sparkfun.com/news.rss",
     "homepage": "https://learn.sparkfun.com/tutorials",
     "parser_id": "sparkfun", "tier": 1},
    {"id": "random-nerd", "name": "Random Nerd Tutorials",
     "feed_url": "https://randomnerdtutorials.com/feed/",
     "homepage": "https://randomnerdtutorials.com/",
     "parser_id": "generic_rss", "tier": 1},

    # Tier 2
    {"id": "make-magazine", "name": "Make: Magazine projects",
     "feed_url": "https://makezine.com/category/projects/feed/",
     "homepage": "https://makezine.com/category/projects/",
     "parser_id": "generic_rss", "tier": 2},
    {"id": "last-minute-engineers", "name": "Last Minute Engineers",
     "feed_url": "https://lastminuteengineers.com/feed/",
     "homepage": "https://lastminuteengineers.com/",
     "parser_id": "generic_rss", "tier": 2},
    {"id": "dronebot-workshop", "name": "DroneBot Workshop",
     "feed_url": "https://dronebotworkshop.com/feed/",
     "homepage": "https://dronebotworkshop.com/",
     "parser_id": "generic_rss", "tier": 2},
    {"id": "all-about-circuits", "name": "All About Circuits",
     "feed_url": "https://www.allaboutcircuits.com/feeds/articles/",
     "homepage": "https://www.allaboutcircuits.com/technical-articles/",
     "parser_id": "all_about_circuits", "tier": 2},
    {"id": "toms-hardware-diy", "name": "Tom's Hardware DIY",
     "feed_url": "https://www.tomshardware.com/feeds/all",
     "homepage": "https://www.tomshardware.com/",
     "parser_id": "generic_rss", "tier": 2},
]


def main():
    rows = [
        (s["id"], s["name"], s["feed_url"], s["homepage"], s["parser_id"], s["tier"])
        for s in SOURCES
    ]
    db.execute_many(
        """INSERT OR REPLACE INTO sources
           (id, name, feed_url, homepage, parser_id, tier, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)""",
        rows,
    )
    db.commit()
    print(f"✓ Seeded {len(SOURCES)} sources")
    r = db.execute("SELECT id, tier, parser_id FROM sources ORDER BY tier, id").fetchall()
    for row in r:
        print(f"  T{row[1]} {row[0]:25} → {row[2]}")


if __name__ == "__main__":
    main()
