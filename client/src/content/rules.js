/**
 * The rule book of Rameirah Empire, as published on the Rameirah Empire Codex
 * (https://www.rameirahcodex.in/rules), last updated 2026-11-13.
 *
 * This is what the Rules page shows while nothing is published from Panel → Rules; the panel can
 * import it with one click ("Import the Codex rule book") and publish it from there.
 *
 * A book:  { id, title, summary, icon, locked, lockedDivisions, divisions: [{ name, sections }], updated, rules }
 * A rule:  { id, number, title, summary, text (Markdown: paragraphs, - lists, 1. lists, **bold**, *italic*,
 *           `code`, | tables |), severity: critical|high|medium|low, level, tags, division, section,
 *           effective, updated, version, penalty }
 * Rule numbers in the text (e.g. HON-06) link to that rule. Rule ids are the anchors (/rules#hon-06).
 */
export const rulesMeta = {
  status: 'published', // 'draft' | 'published'
  lastUpdated: '2026-11-13',
}

export const ruleCategories = [
  {
    "id": "the-code-of-honour",
    "title": "The Code of Honour",
    "summary": "How every citizen of the Empire treats other people, in the city, on Discord and anywhere else the community meets.",
    "icon": "Users",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "hon-01",
        "number": "HON-01",
        "title": "Respect for Every Citizen",
        "summary": "Be decent to people. No harassment, no threats, and fix things when you get it wrong.",
        "text": "Behind every character is a real person, and what is said here can stay with them after they log off.\n\n- Never harass, intimidate or threaten another player.\n- Respect people's limits and their privacy. Their personal details are theirs to share, not yours (see HON-06).\n- When you hurt or upset someone, say sorry and make it right.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Conduct",
          "Respect",
          "Privacy",
          "Boundaries",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "hon-02",
        "number": "HON-02",
        "title": "Protection from Harassment",
        "summary": "No player may be singled out for gender, sexuality, religion, region or language, and sexual comments towards anyone are not allowed. The penalty is a permanent ban.",
        "text": "No player may be singled out because of their gender, sexuality, religion, region or language. Sexual comments, innuendo or advances towards any player are not allowed (see HON-07). Women are often the target, so these cases are treated with no tolerance.\n\n**Penalty:** permanent ban.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Harassment",
          "Consent",
          "Conduct",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-03",
        "number": "HON-03",
        "title": "Language & the Strike Ladder",
        "summary": "Abuse is judged by tone as well as words. Bans climb a strike ladder from 3 days to permanent on the 4th strike, and your record resets after 30 clean days.",
        "text": "Our citizens come from many regions, so a single word is not automatically abuse. The FRP respondent, the on-call Admin and the Management Team look at the tone and intent as well as the words, and they make the final call.\n\n**How the strike ladder works**\n\nA strike is added for each abusive-language or parental-abuse ban (HON-03, HON-04). If you go 30 days after a ban ends with no new strike, your record resets to zero. Abuse while banned (for example on Discord) counts as a new strike.\n\n| Strike | Ban |\n| --- | --- |\n| 1 | 3 days |\n| 2 | 7 days |\n| 3 | 14 days |\n| 4 | Permanent |",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Abusive Language",
          "Strike System",
          "Conduct",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-04",
        "number": "HON-04",
        "title": "Family Is Off-Limits",
        "summary": "Insulting anyone's parents or family, in or out of character, is parental abuse and goes on the strike ladder.",
        "text": "A character's parents and a player's real family are both protected. Insults dressed up as wordplay, rhymes or clever loops are judged exactly the same as direct ones.\n\n**Penalty:** follows the HON-03 strike table.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Parental Abuse",
          "Family",
          "Strike System",
          "Conduct",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-05",
        "number": "HON-05",
        "title": "Whoever Lights the Fuse",
        "summary": "If you provoke someone into abuse, you answer for it too.",
        "text": "Goading another player until they break HON-03 or HON-04 makes you part of the offence. Management watches the full POV to decide three things: who started it, how it started, and what pushed it over the line.\n\n**Penalty:** the person who provoked it gets the same penalty as the offender, or one step lower if Management judges the provocation minor.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Initiator's Clause",
          "Provocation",
          "Conduct",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-06",
        "number": "HON-06",
        "title": "Real Life Stays Private",
        "summary": "Sharing someone's real-life details, or threatening anyone in real life, is a permanent ban everywhere, with no warning.",
        "text": "Nothing about a member's real life (name, address, photos, workplace or anything else) is shared without their permission. This is doxxing.\n\nReal-world threats or actions against a member are handled the same way, and we will pass the matter to the authorities.\n\n**Penalty:** immediate permanent ban from every Rameirah platform. No warning is given, and the ban cannot be appealed (JUS-08).",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Privacy",
          "Doxxing",
          "Threats",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-07",
        "number": "HON-07",
        "title": "Keep It Clean",
        "summary": "No explicit content or sexual talk anywhere, no indecent emotes, and character models must be fully clothed.",
        "text": "- **Explicit content.** There is no NSFW space in Rameirah. Posting explicit material anywhere is a ban with no appeal.\n- **Sexual talk.** Sexual language and themes are not allowed, in character or out of it.\n- **Emotes.** Indecent emotes get you kicked on the spot. Doing it again can lead to a permanent ban.\n- **Character looks.** Character models must be fully clothed (underwear or swimwear at minimum). No nude or see-through clothing, because many citizens stream the city.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "NSFW",
          "Content",
          "Emotes",
          "Conduct",
          "Characters",
          "Streaming",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-08",
        "number": "HON-08",
        "title": "Staff, the Council & the Empire",
        "summary": "Do what staff say, stay out of their scenes, and never insult staff or try to damage the server. Raise concerns through a ticket.",
        "text": "**Working with staff**\n\n- Follow staff instructions straight away, in game and on Discord. Do not argue, stall or ignore them.\n- Keep out of any scene, investigation or situation staff are handling. If you are told to leave, leave.\n- If you think a decision was wrong, open an official Discord ticket once the situation is over. A ban can be appealed once (JUS-08).\n\n**Respect**\n\n- Insults, personal attacks or discriminatory remarks against any staff member, inside or outside the city, lead to a temporary or permanent ban, depending on how serious Management judges it.\n- Trying to damage Rameirah, for example spamming other communities with attacks, encouraging players to leave, or spreading false claims about the server, is a permanent ban. Honest criticism through tickets, feedback channels or the suggestion system is always welcome (HON-10, CRE-05).\n\n**Penalty:** a warning, kick, suspension or ban for ignoring staff, depending on the circumstances. Penalties for disrespect are listed above.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Staff",
          "Scenes",
          "Tickets",
          "Admin",
          "Server",
          "Respect",
          "Conduct",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-09",
        "number": "HON-09",
        "title": "Recordings of Staff & Community",
        "summary": "Do not record staff or private community talk without good reason, and never use recordings to shame, threaten or mislead.",
        "text": "- Recording your own gameplay for POVs (JUS-04) is always allowed.\n- Do not record staff conversations, Discord voice channels, support tickets or other community communications without a legitimate reason.\n- A recording or screenshot may be used only as evidence in a report, investigation or appeal you are part of. Staff may review it, but it must not be shared publicly without authorisation.\n- Never use captured communications to harass, threaten, embarrass or blackmail anyone, or to stir up drama.\n- Never edit, cut or twist a recording to mislead staff or members.\n\n**Penalty:** a warning, kick, temporary suspension or permanent ban, depending on how serious it is.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Staff",
          "Scenes",
          "Tickets",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "hon-10",
        "number": "HON-10",
        "title": "Taking Issues to the Right Place",
        "summary": "Arguments go to tickets or DMs. Complaints and ideas go to the suggestion system or staff.",
        "text": "Public spaces are not for fights. Disputes do not belong in Discord voice or text channels, the FRP voice channel, or the city. Take them to a ticket or a private message.\n\nComplaints and suggestions go through the suggestion system or directly to staff, not general chat. Report ping spam to staff.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Discord",
          "Disputes",
          "Tickets",
          "The Code of Honour"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "citizenship",
    "title": "Citizenship",
    "summary": "What it means to hold a place in the Empire: your account, your name, your profile and what you owe the community.",
    "icon": "Scroll",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "cit-01",
        "number": "CIT-01",
        "title": "One Account, One Owner",
        "summary": "You answer for everything done on your account, whoever was playing.",
        "text": "If a friend or family member plays on your account and breaks a rule, the punishment lands on you.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Accounts",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cit-02",
        "number": "CIT-02",
        "title": "Banned Means Banned",
        "summary": "Joining on another account while banned makes your ban permanent.",
        "text": "Serve your ban or appeal it once through an appeal ticket (JUS-08). Coming back on a second account turns any ban into a **permanent** one.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Bans",
          "Accounts",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-03",
        "number": "CIT-03",
        "title": "Your Citizen Name",
        "summary": "Your FiveM name and Discord nickname are both your character's name, with your group tag in front if you have one. Every name is unique.",
        "text": "- Set your FiveM name and Discord nickname to your character's full name. Example: a character called Arjun Nair uses **ARJUN NAIR** in both places.\n- If you belong to an approved group (police, EMS, a gang or another recognised organisation), put its tag first: **RCPD | ARJUN NAIR**.\n- No two characters may share a name, and copies, near-copies or joke versions of an existing name are not allowed. The first registered character keeps the name, and staff decide what counts as a near-copy.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Names",
          "Discord",
          "FiveM",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-04",
        "number": "CIT-04",
        "title": "Profile Standards",
        "summary": "Keep your username, display name, avatar, bio, status and pronouns clean. Change them when staff ask.",
        "text": "Nothing on your profile may be offensive, political, sexual or trolling, or meant to provoke other members.\n\n**Penalty:** refusing a staff request to change it, or changing it back later, means a warning and then a kick. Sexual or hateful profile content is a ban without warning (HON-07).",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Profile",
          "Username",
          "Avatar",
          "Bio",
          "Status",
          "Pronouns",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-05",
        "number": "CIT-05",
        "title": "Loyalty to Rameirah",
        "summary": "While you are a citizen here, other servers stay out of your profile and your conversations.",
        "text": "- **No promotion.** No invites or links to other servers in your Steam or Discord name, Discord status, avatar or icon. Rameirah links are welcome.\n- **No outside identities.** No names, call signs or tags from other servers. Your name follows CIT-03.\n- **No outside talk.** Do not promote, recruit for or compare other servers, on Discord or in the city.\n\n**Penalty:** staff will ask you to remove it. Refusing, or doing it again, means a kick and then a community ban.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Advertising",
          "Advertise",
          "Other Servers",
          "Names",
          "Discord Status",
          "Server Invites",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-06",
        "number": "CIT-06",
        "title": "Premium Items Are Not for Sale",
        "summary": "Items from a paid plan belong to you alone. Selling or trading them for anything outside the city can get you banned.",
        "text": "You may not sell plan items, or swap them for real money or anything of value outside the city. See the Premium Plan Guidelines for what you can do with them. Until that section is published, ask staff in a ticket.\n\n**Penalty:** a community ban. Staff may act without a report.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Premium",
          "Trading",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-07",
        "number": "CIT-07",
        "title": "No Soundboards",
        "summary": "Soundboards are banned in the city. Using one means anything from a kick to a permanent ban.",
        "text": "No clips, sound effects or music through a soundboard, anywhere in Rameirah.\n\n**Penalty:** from a kick up to a permanent ban, depending on the situation and your past warnings.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Soundboards",
          "Voice",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cit-08",
        "number": "CIT-08",
        "title": "Away From Keyboard",
        "summary": "Long AFK spells can get you kicked, losses while AFK are your own, and AFK farming pay or gang time can get your character deleted, after a warning and a check of the logs.",
        "text": "**Stepping away**\n\n- AFK means no input for 15 minutes. Long AFK periods can get you kicked.\n- If you must leave, take your character somewhere quiet and out of sight first.\n- An AFK player may be robbed but not killed, kidnapped or taken hostage, and never on Sanctuary ground, so protecting your character is your job.\n\n**AFK grinding**\n\n- Sitting AFK on a whitelisted job to collect pay gets you removed from the job. Staff check the logs before taking action, a first offence gets a warning, and repeat offences can mean your character is deleted with all its assets.\n- Idling to build up the minimum playtime needed to join a gang counts as AFK grinding too.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "AFK",
          "Jobs",
          "Economy",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cit-09",
        "number": "CIT-09",
        "title": "Each Character Is Its Own Person",
        "summary": "Money, weapons and vehicles stay with the character that earned them, even through a middleman.",
        "text": "You may not pass money, weapons or vehicles from one of your characters to another. Using a middleman does not make it allowed, even if it is played as roleplay, and the middleman can be punished as well. Staged robberies or deaths used to move assets count as a transfer too.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Assets",
          "Multiple Characters",
          "Citizenship"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "the-craft",
    "title": "The Craft",
    "summary": "The discipline of good roleplay: playing a character honestly, knowing only what they know, and letting stories run fairly.",
    "icon": "BookOpen",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "crf-01",
        "number": "CRF-01",
        "title": "Player and Character",
        "summary": "You are the player, not the character. Speaking as yourself in a scene is going out of character (OOC).",
        "text": "Keep a clear line between you and the person you play. You are out of character when you:\n\n- talk about events or places your character never experienced, or that never happened in the city;\n- bring up the real-life situation of a player or group;\n- use out-of-city words, such as \"FRP\" or names of FRP types;\n- let one of your characters use something another of your characters knows. Your characters are strangers to each other.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "OOC",
          "Immersion",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "crf-02",
        "number": "CRF-02",
        "title": "Only What Your Character Knows",
        "summary": "Act only on what your character saw, heard or was told in the city. Discord, server tools, streams, your other characters and details like a voice, vehicle or outfit do not count.",
        "text": "Using information your character could not have is **meta gaming**. Examples:\n\n- Finding people or groups with server tools such as menus or information bars. Those tools are for you, not your character.\n- Feeding scene details to friends or your group over Discord or any outside channel.\n- Carrying knowledge between your own characters, or inventing a story for how it \"reached\" them.\n\n**Stream sniping** is meta gaming through someone's live stream, in or out of the game:\n\n- using what you see on a stream to help yourself or hurt someone else;\n- using a stream to find a streamer and then pushing into their scene.\n\n**Voice ID** is recognising a masked character by voice, vehicle, outfit or any other detail your character has no in-character reason to link to them. It is not allowed. If someone is masked, treat them as the stranger they appear to be.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Metagaming",
          "Stream Sniping",
          "OOC",
          "Alt Characters",
          "Voice ID",
          "Masks",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "crf-03",
        "number": "CRF-03",
        "title": "Masks & Disguise",
        "summary": "Introduce yourself honestly. Using a mask and voice changer to provoke people or force unwanted scenes is fail-RP and a ban.",
        "text": "Let people know who your character is. A disguise is allowed for real roleplay, but a mask plus voice changer used to bait players or drag them into situations they never agreed to is treated as fail-RP.\n\n**Penalty:** ban.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Identity",
          "Voice Changer",
          "Fail RP",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "crf-04",
        "number": "CRF-04",
        "title": "Life Has Value",
        "summary": "Your character wants to live, and wants their friends to live. When outgunned or when a friend is a hostage, comply instead of fighting.",
        "text": "Playing as if death means nothing is **No Fear RP**, a fail-RP.\n\n- **Your own life.** At gunpoint with no weapon in your hand, or outnumbered 2-to-1 or more by armed players, you must show fear and comply. If you already have a weapon drawn and the odds are even (PD-1.10), you may fight back.\n- **A friend's life.** If someone your character cares about is held hostage, meet the hostage taker's demands rather than fight. Ignoring the risk to your friend counts as No Fear RP too.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Fear RP",
          "Value of Life",
          "Hostage",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "crf-05",
        "number": "CRF-05",
        "title": "Forcing the Outcome",
        "summary": "Do not bend a scene your way by pushing people out of character, using server powers, or building a one-sided scene with no options for the other side.",
        "text": "This is **power gaming**. It includes:\n\n- forcing other players to drop character so the scene can continue;\n- using powers or tools the server gave you to win a scene;\n- refusing to talk in an ordinary scene, or building a one-sided scene, so the other side has no real options and no room to negotiate.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Powergaming",
          "Fair Play",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "crf-06",
        "number": "CRF-06",
        "title": "Dirty Tricks in a Scene",
        "summary": "Win scenes through roleplay, not tricks like name-revealing emotes, collisions or model bugs.",
        "text": "This is **impure roleplay**. Examples:\n\n- using emotes to reveal a character's name or the player behind them;\n- using out-of-character methods to get an advantage;\n- engaging through collisions, model bugs or anything else that is not roleplay.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Impure RP",
          "Exploits",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "crf-07",
        "number": "CRF-07",
        "title": "Other People's Stories",
        "summary": "Do not hijack a scene that is not yours, or force a character to act outside their role.",
        "text": "This is **lore breaking**. It takes two main forms:\n\n- **Hijacking.** Walking into an unrelated scene and taking it over. Example: starting your own drama in the middle of someone's proposal roleplay.\n- **Forcing a character out of role.** Engineering a situation where a character or group, such as the police, can only respond by breaking their own roleplay limits.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Lore",
          "Immersion",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "crf-08",
        "number": "CRF-08",
        "title": "Provoking the Police",
        "summary": "Do not create a scene only to start a gunfight or a nasty clash with the police.",
        "text": "Normal run-ins with officers are fine. **Cop baiting** is setting one up for the sole purpose of a fight or an ugly confrontation, for example:\n\n- swearing at or degrading an officer to force them to act, or to break their police roleplay;\n- ramming (pitting) a patrol car to start a situation;\n- starting a scene \"for RP\" and then not playing it out respectfully.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Cop Baiting",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "crf-09",
        "number": "CRF-09",
        "title": "Death, Revival & Memory",
        "summary": "After a true death your character forgets the death and leaves the situation. An EMS revive is only a knockout.",
        "text": "**True death.** Your character has truly died if they were:\n\n- killed and their body burnt;\n- drowned;\n- brought back by the auto-revive system; or\n- force-respawned by an Admin.\n\nAn officer's body is never burnt (PD-1.11); the other true-death methods apply to officers too.\n\nAfter a true death your character has **amnesia**. They forget how they died, who did it and what led up to it, and they are out of any situation they were in. If your body was disposed of in one of these ways, respawn. If you do not, an Admin will respawn you.\n\n**Learning what happened.** Your character can only find out how they died, and who killed them, if told in person by:\n\n- a witness who was not involved; or\n- someone involved who survived (not knocked out, killed or respawned).\n\nThe killers may also tell you in person to carry the story on, but it must not become another fight. Learning who killed you never allows revenge in the same day or war unless a new in-character reason arises (CON-09).\n\n**EMS revive.** Being revived by EMS means your character was knocked out, not killed. After an EMS revive you may rejoin only if the situation is still happening where you went down, and RMD revived you there.\n\n**Penalty:** going back into a scene against this rule means a force revive with your inventory cleared.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "NLR",
          "Death",
          "EMS",
          "Respawn",
          "Auto Revive",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "crf-10",
        "number": "CRF-10",
        "title": "Carrying the Fallen",
        "summary": "Carry an unconscious or dead player only for real roleplay. Never by vehicle, and never as a hostage.",
        "text": "- Carry a downed player only for a genuine reason, such as moving them to safety or to a place where RMD can reach them, or for police procedures.\n- Dead carry by vehicle is bug exploitation and is not allowed. The exception is police and RMD using the in-game escort or transport function.\n- Unconscious or dead players can never be used as hostages or bargaining chips.\n- Do not use dead carry to escape, move people or gain an edge during an active scene.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Dead Carry",
          "Exploits",
          "Hostage",
          "EMS",
          "The Craft"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "conflict",
    "title": "Conflict",
    "summary": "When roleplay turns hostile: how fights start, how they are fought, and the limits on robberies, hostages and gangs.",
    "icon": "ShieldAlert",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "con-01",
        "number": "CON-01",
        "title": "Earn the Fight",
        "summary": "Every attack needs a real reason and real interaction first. Attacking without one, or shooting before talking, is RDM.",
        "text": "**Random Death Match (RDM)** is attacking or killing a player with no genuine interaction beforehand. There must be an actual trigger or situation between you and them. A genuine interaction is at least one clear in-character exchange (by voice) that both sides could hear, and a reason to escalate.\n\n**Guns over roleplay** is a type of RDM: pulling a weapon and firing without any communication, putting PvP ahead of roleplay.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "RDM",
          "Combat",
          "Initiation",
          "Communication",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-02",
        "number": "CON-02",
        "title": "Citizen Disputes",
        "summary": "Citizen vs. Citizen scenes have at most 4 people and 2 vehicles of any kind, start calm, and must build before they turn violent.",
        "text": "**Limits**\n\n| Limit | Maximum |\n| --- | --- |\n| People in one situation | 4 |\n| Vehicles (any kind) | 2 |\n| Active situations per citizen at once | 1 |\n\nPolice and RMD do not count towards these limits.\n\n**Escalation**\n\n- Citizen vs. Citizen scenes are non-hostile until roleplay makes them otherwise.\n- Turning hostile needs real roleplay build-up and a valid in-character reason.\n- Jumping straight to aggression or violence is Fail RP.\n\n**Not allowed:** using alt characters, middlemen or proxy players, or out-of-character communication to get around these limits.\n\n**Penalty:** any attempt to bypass these rules is Major Fail Roleplay (Major FRP).",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Citizen",
          "Participation Limits",
          "Escalation",
          "Major FRP",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-03",
        "number": "CON-03",
        "title": "Warning Fire",
        "summary": "Once a situation is live, fire a visible, audible warning before using lethal force on someone who has not drawn a weapon: 3 rounds from a pistol, 10 from anything else.",
        "text": "A **warning fire** is your last signal before lethal force. It must give the other person a fair chance to surrender, comply or react.\n\n**When you must fire one** (on foot or in a vehicle)\n\n- Before using lethal force on someone who has not drawn a weapon, fire a warning first.\n\n**How to fire it**\n\n- Aim toward the player without trying to hit them. The ground or the sky is fine, as long as they clearly see and hear it.\n- Minimum rounds: **3 from a pistol**, **10 from any other weapon**.\n- Warning fire counts as gunfire under GRD-02 and is never allowed on protected ground.\n\n**When you can skip it**\n\n- The other player draws, aims or tries to fire a weapon. You may respond at once without finishing the warning.\n- Both sides are already in the same active scene and hostile intent is clear.\n\nSkipping a required warning fire is fail-RP. If no situation has started at all, this rule does not apply: shooting would be RDM under CON-01.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Combat",
          "Warning Fire",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-04",
        "number": "CON-04",
        "title": "Weapons on Show",
        "summary": "Waving a weapon around in the city is an arrestable crime, more so in front of government officials.",
        "text": "Brandishing a weapon within city limits can get you arrested, and doing it in front of government officials makes it worse. Rameirah is a roleplay city, not a place to show off guns. Ending a scene through words instead of violence is the real skill here.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Weapons",
          "PvP",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "con-05",
        "number": "CON-05",
        "title": "Fights With No Story",
        "summary": "No killing friends for fun, no deathmatching, no \"1v1\" duels. Use the TDM and FFA arenas instead.",
        "text": "Deaths with no story behind them break the city for everyone. That includes killing your friends, deathmatching, and setting up \"1v1\" gunfights for laughs or ego. If you just want to fight, use the **Team Death Match** or **Free For All** arenas.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Combat",
          "Immersion",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "con-06",
        "number": "CON-06",
        "title": "Vehicles Are Not Weapons",
        "summary": "Using a vehicle as a weapon, deliberately or carelessly, is VDM. Lag, or a player stepping into your path, is not VDM.",
        "text": "**Vehicle Death Match (VDM)** is deliberately or carelessly hurting or killing a player with a vehicle. Lag, or a player stepping into your path, is not VDM. The reverse also applies: throwing yourself in front of a vehicle to die is not a tactic, and it cannot be reported as VDM.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "VDM",
          "Vehicles",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-07",
        "number": "CON-07",
        "title": "Robberies",
        "summary": "No gang assets, no job or spawned vehicles unless pre-planned with Management and RCPD, never above the robbery count, and PvP Robberies (no RP) end with no RP.",
        "text": "**Not allowed in a robbery**\n\n- Gang vehicles or gang assets (outfits, vehicles, chat).\n- Job vehicles or spawned vehicles, unless the robbery was pre-planned and Management and the RCPD heads were told beforehand.\n\n**Robbery count.** Never go over it, unless Management and the RCPD heads approved a pre-planned roleplay robbery. If the count is exceeded, the RCPD responds with every available unit.\n\n**PvP Robbery (no-RP).** There is no roleplay before or after a PvP Robbery. When it ends, robbers leave without engaging the police. In a roleplay robbery you play the whole situation out (PD-1.17). This is not the police's Section 144 Code 99 (PD-4.02).",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Robbery",
          "Police",
          "Heists",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-08",
        "number": "CON-08",
        "title": "Hostages",
        "summary": "One hostage, 20 minutes at most, never fake and never a gang leader taking no part. Hostages show fear. Demands top out at 50 Lakhs, by phone or face to face.",
        "text": "**Limits**\n\n| Limit | Rule |\n| --- | --- |\n| Hostages per situation | 1, unless stated otherwise |\n| Longest hold | 20 minutes |\n| Highest demand | Assets worth 50 Lakhs (in-game money) |\n| Who cannot be taken | Gang Leaders and Co-Leaders, unless they are taking part in the situation. RMD personnel (RMD-13). |\n| Fake hostages | Never (fail-RP) |\n\n**Making demands**\n\n- Demands are made by phone or in person. Chat demands are ignored.\n- You cannot demand job-specific assets from police or government, or anything in evidence or locked lockers.\n- You cannot demand the release of someone already in jail.\n\n**If you are the hostage**\n\n- Show real fear when taken, and when someone tries to take you.\n- Each time an Admin sees you skip Fear RP, you can be held 20 minutes longer.\n- Repeatedly ignoring Fear RP, or acting tough, ends in an **indefinite ban** for ruining the scene.\n\n**Logging out as a hostage.** Anyone who logs out as a hostage is punished under CON-10. A gang member also gets an **Indefinite Gang Restriction**: no gang activity at all until the opposing gang officially confirms it has no objection. Staff will not lift it without that. The scene continues with a replacement hostage.\n\n**Never allowed:** humiliation of any kind (for example licking shoes, or urinating or defecating on a hostage), or forcing hostages to post messages in chat.\n\nIf you cannot commit to a hostage scene, stay out of gang conflicts and other high-risk roleplay. The Gang section is not published yet; until it is, ask staff in a ticket about gang leaders, co-leaders and gang wars.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Hostage",
          "Fear RP",
          "Gangs",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-09",
        "number": "CON-09",
        "title": "Gang Situations Stay Contained",
        "summary": "Only people present when a gang situation starts may take part. Calling in other gangs or coming back for revenge is fail-RP.",
        "text": "- A gang member's friends, partners or allied gangs cannot be pulled into a situation. Calling in another gang is fail-RP.\n- Someone who was already with them when it started may join. If anything happens to that person, the gang may not ask about it or get involved.\n- Gang members cannot use companions to escalate. Anyone protecting the player does it alone.\n- Joining because \"someone told us\", or returning for revenge later, is fail-RP.\n- Learning who killed you never allows revenge in the same day or war unless a new in-character reason arises (CRF-09).",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Gangs",
          "Relationships",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-10",
        "number": "CON-10",
        "title": "No Escaping by Logging Out",
        "summary": "Quitting or timing out to dodge a situation is combat logging. If you crash, return to the same spot and tell an Admin within 5 minutes.",
        "text": "**Combat logging** is leaving the server mid-situation to avoid it, then returning later or straight away without letting the other side finish. Quitting and timing out are treated the same.\n\nIf you genuinely crash, return to the same spot and tell an Admin within **5 minutes**. Your 5 minutes count from the disconnect, and the server log will be checked. Staying away longer still counts as combat logging.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Combat Logging",
          "Gangs",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "con-11",
        "number": "CON-11",
        "title": "Bugs, Glitches & Exploits",
        "summary": "Using a bug for an advantage, or hiding one, can mean a permanent ban. Report it to staff and tell nobody else.",
        "text": "Exploiting glitches or unrealistic mechanics in the game or server build is not allowed. Common examples:\n\n- refreshskin or reloadskin to clear a debuff, such as being tased;\n- camera mode to listen to talk outside your character's view (camera mode has no sound by design);\n- emotes to dodge bullets, actions or debuffs in a fight (approved PvP emotes such as the gunslinger set are fine);\n- carrying several people at once on foot or in a vehicle, or a driver carrying a player (police and RMD using the in-game escort or transport function are the exception);\n- job bugs used to farm money.\n\nIf you find a bug, report it to staff straight away and do not explain it to anyone else.\n\n**Penalty:** up to a permanent ban, for using a bug or for keeping one quiet.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Exploits",
          "Cheating",
          "Bug Reporting",
          "Bugs",
          "Conflict"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "ground-hours",
    "title": "Ground & Hours",
    "summary": "Where and when conflict is not allowed.",
    "icon": "ShieldCheck",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "grd-01",
        "number": "GRD-01",
        "title": "Protected While Working",
        "summary": "A player doing their job cannot be killed or taken hostage there, if they were already working. Illegal grinding protects you from citizens and gangs, not from police.",
        "text": "While a citizen is working, they are treated as standing on sanctuary ground. Killing them or taking them hostage there is fail-RP.\n\nSanctuary applies only if you were already working before the situation began. Starting work to escape a situation is fail-RP.\n\nGrinding at an illegal location protects you from other citizens and gangs, not from police.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Green Zone",
          "Fail RP",
          "Hostages",
          "Ground & Hours"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "grd-02",
        "number": "GRD-02",
        "title": "Sanctuary Grounds",
        "summary": "Some places are off-limits to conflict. Scenes that start inside must leave within 15 minutes, and running into one mid-fight is an instant kick.",
        "text": "**The three grades of ground**\n\n| Grade | Can a situation start here? | Can it play out here? | Gunfire | Places |\n| --- | --- | --- | --- | --- |\n| Sanctuary | No | No, and none may be brought in | Never | Hospitals and EMS sites, event sites, job sites, legal businesses (clubs included), police impounds |\n| Neutral Ground | Yes | No | Never starts or enters | Main garage and all public garages, gang meeting areas |\n| Guarded Ground | Only with police | Only with police | Only if police fire first | Police headquarters and other police sites |\n\n**Rules for every grade**\n\n- If a situation wrongly starts in Sanctuary, or spills onto Neutral or Guarded ground, everyone involved must move out within **15 minutes**, counted from when an Admin announces it. Anyone still there after that is kicked.\n- Once a situation is running outside, nobody involved may run into protected ground, especially during a fight. That is an **instant kick**.\n- Pushing or hitting someone out of protected ground to hurt them gets you kicked.\n\n**Exception.** Police may arrest a player with a government-issued warrant on any ground, without force (PD-1.16). No gunfire is allowed.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Safe Zones",
          "Green Zones",
          "Ground & Hours"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "grd-03",
        "number": "GRD-03",
        "title": "The Night Truce",
        "summary": "From 2:00 AM IST to the morning restart the whole Empire is sanctuary. Fights end at 2:00 AM IST, except wars declared before 1:30 AM, and no new robberies may start.",
        "text": "From **2:00 AM IST until the morning restart**, all of Rameirah Empire counts as protected ground.\n\n- PvP still running at 2:00 AM IST ends, unless it is a war officially declared before **1:30 AM IST**. Until the Gang section is published, ask staff in a ticket about wars.\n- Build-up fighting before a war cannot run past 2:00 AM IST. If it does, the server ends it, and it can resume after the truce.\n- No new robberies may start after 2:00 AM IST. Robberies already running, other PvP scenes (not random brawls or Section 144 scenes) and planned scenes already running (drug or weapons busts) may finish if the Admins allow it.\n\nFewer staff are online after 2:00 AM IST. The team helps where it can but cannot promise a quick response.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Safe Zones",
          "Server Restart",
          "Ground & Hours"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "justice",
    "title": "Justice",
    "summary": "How rule breaks are reported, judged and settled, from the moment something goes wrong to the final ruling.",
    "icon": "Gavel",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "jus-01",
        "number": "JUS-01",
        "title": "When to Call an Admin",
        "summary": "Call an Admin only when a technical fault stops you playing, never during a gang situation. Report FRP after the scene ends.",
        "text": "- Ask for Admin help only if a bug, glitch or technical fault stops you from playing.\n- Never call Admins during a gang situation. They will not step in on Fail RP there. Finish the scene and open an FRP ticket afterwards. Admins may still watch any scene and act on what they see.\n- Not sure about a rule? Check the Codex instead of interrupting Admins mid-scene.\n- If a situation becomes uncontrollable, seriously disruptive or a risk to server stability, Admins may step in with full authority. Their decision is final.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Admin",
          "Tickets",
          "Gang",
          "Fail RP",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-02",
        "number": "JUS-02",
        "title": "Shadow Actions",
        "summary": "Shadows can punish on the spot, with no warning, for vulgar language and parental abuse. Never pressure Admins to act mid-scene.",
        "text": "A **Shadow Action** is an instant punishment given by the Shadows.\n\n- **No warning** is given for vulgar or offensive language, or for parental abuse.\n- Players who keep committing FRP after a warning may get a Shadow Action without further notice.\n- Do not ask, demand or pressure Admins to act during a running RP or PvP scene.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Shadow",
          "Spot Action",
          "Admin",
          "Conduct",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "jus-03",
        "number": "JUS-03",
        "title": "The Reporting Clock",
        "summary": "Open an FRP ticket within 4 hours of the incident and send your POV within 12 hours of opening it.",
        "text": "| Step | Deadline |\n| --- | --- |\n| Open the ticket and explain what happened | Within 4 hours of the incident. Doxxing, threats and exploits (HON-06, CON-11) can be reported at any time. |\n| Submit your POVs | Within 12 hours of opening the ticket |\n| FRP discussions | Daily, 6:00 PM to 8:00 PM IST, unless the FRP Team announces a change |\n\n*Example:* an incident at 1:00 PM needs a ticket by 5:00 PM. A ticket opened at 1:00 PM needs POVs by 1:00 AM.\n\n- **Everything on camera counts.** Reporters must list every FRP when they open the ticket (JUS-05). Staff may still act on any FRP they see in the POVs.\n- **An FRP is called when a ticket is opened.** Never call FRP inside the city.\n- **The scene is frozen.** Once a ticket is opened, nobody may continue that situation, or anything linked to it, until the FRP Team closes the case.\n- **False reports.** A frivolous or false FRP report is itself an FRP. If the reporter goes silent, the freeze lifts and the reporter gets a warning.\n- **No precedents.** Each case is judged on its own facts. Pointing to past cases will not be accepted.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Ticket",
          "Deadline",
          "POV",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-04",
        "number": "JUS-04",
        "title": "Evidence: Your POV",
        "summary": "Every report needs a valid POV: full, unedited footage with your voice, on a permanent public link.",
        "text": "A **POV** (your video recording) is the main evidence Shadow and the FRP Team use. Any report of Fail RP or any other rule break needs one, and both sides may be asked for theirs. Gang, police and PvP players must record whenever they are in a situation.\n\n**A valid POV**\n\n- Is full and unedited, showing before, during and after the incident.\n- Includes the recorder's voice, even if they were not directly involved. Missing or unclear audio makes it invalid.\n- Is ideally at least 2 to 3 minutes long, so the lead-up is clear.\n- Is uploaded directly, or shared through YouTube (unlisted or public), Google Drive (public access), OneDrive or another permanent link.\n- Stays online until the ticket is fully closed.\n\nFor Discord or out-of-game reports, full uncropped screenshots with timestamps are accepted instead of a video.\n\n**Not accepted**\n\n- WeTransfer, MediaFire or any expiring link. These tickets close automatically.\n- Google Drive links that are not open to everyone. The FRP Team will not request access.\n- POVs sent after the 12-hour deadline.\n- Clips from other players' or staff members' streams, unless Management approves them in a special case.\n\n**Penalty:** failing to provide a valid POV when asked can mean a Normal Ban or PvP Ban, decided by the FRP Team.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "POV",
          "Evidence",
          "Video",
          "Fail RP",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-05",
        "number": "JUS-05",
        "title": "Writing Your Ticket",
        "summary": "State what happened, which rule was broken and the exact IST time, list every FRP up front, and timestamp each one.",
        "text": "Your ticket must include:\n\n1. A clear account of what happened and which rule was broken.\n2. The exact date and time of the incident, in IST.\n3. The exact words used, if vulgar language is part of the report.\n4. Every FRP you are reporting, listed when you open the ticket. Staff may still act on anything else they see in the POVs, but FRPs you add later may not be considered.\n5. Timestamps for each FRP in your POV, plus when the situation started.\n\nTimestamp format: `FRP Type : HH:MM` (for example `NO FEAR RP : 12:15`).\n\nA thin explanation slows your ticket down, so give the team enough detail to understand your side.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Ticket",
          "Timestamps",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-06",
        "number": "JUS-06",
        "title": "The Hearing",
        "summary": "You cannot pick who handles your case. Only the people involved attend, and arguing can earn a timeout.",
        "text": "- You may not request or demand a particular FRP Team member.\n- Any FRP Team member involved in the case, or in the same gang or group, must step aside.\n- Only the reporter and the players involved may join. For gang cases, that means the Gang Leader, Co-Leader and members directly involved.\n- Players must not argue with each other. If it gets out of hand, the FRP Team can give a timeout or take other action.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Discussion",
          "Gang",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-07",
        "number": "JUS-07",
        "title": "Missed Calls, Closures & Appeals",
        "summary": "Miss your hearing and the case is decided without you. Miss a second voice call and you lose your whitelist until it closes.",
        "text": "- **No-show for 24 hours.** If you do not respond within 24 hours after the FRP Team first pings you, action is taken on the evidence available, and that FRP is not discussed again.\n- **Missed voice call.** If you are called to the FRP voice channel and do not come, you get a second call first. If you miss that too, your whitelist is removed until the case closes.\n- **Silent reporter.** If the reporter stops responding or never sends the POV, the ticket is closed, the freeze lifts, the reporter gets a warning and the case cannot be reopened.\n- **Spam appeals.** Pointless or repeated appeals lead to extra bans or penalties.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "No-Show",
          "Appeals",
          "Whitelist",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "jus-08",
        "number": "JUS-08",
        "title": "Final Rulings & Appeals",
        "summary": "Rulings are based on the evidence in the ticket. You may appeal a ban once, within 7 days, with new evidence. Management decides appeals and its decision is final.",
        "text": "- Rulings are based on the POVs and evidence in the ticket.\n- You may appeal a ban once, through an appeal ticket, within 7 days of the ruling. The appeal must give new evidence or show a mistake in the ruling.\n- Management's decision on the appeal is final.\n- Repeated or pointless appeals are penalised (JUS-07).\n- Bans marked \"no appeal\" (HON-06, HON-07 explicit content) cannot be appealed.\n- Punishments depend on each situation, so past rulings cannot be used for comparison.\n\nManagement has the final word on every FRP matter.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Decision",
          "Appeals",
          "Management",
          "Justice"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      }
    ]
  },
  {
    "id": "creators",
    "title": "Creators",
    "summary": "Rules for everyone who streams or records the Empire, followed by how the Streamer and Content Creator roles are earned.",
    "icon": "Video",
    "locked": false,
    "lockedDivisions": [],
    "divisions": [],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "cre-01",
        "number": "CRE-01",
        "title": "Every Rule Applies On Air",
        "summary": "Going live changes nothing. \"It was for content\" is never an excuse, and your moderators keep your chat clean.",
        "text": "- Every rule in the Codex applies while you are live.\n- Your role does not entitle you to special treatment or advantages.\n- Never encourage rule breaks, toxicity or harassment, yourself or through your chat.\n- Your moderators must keep chat free of hate, spoilers and meta gaming.\n- You must follow your platform's Terms of Service (YouTube, Twitch, Kick and others). Action taken against your channel is your responsibility.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Chat",
          "Moderators",
          "Role",
          "Requirements",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-02",
        "number": "CRE-02",
        "title": "Discord Stays Off Stream",
        "summary": "Mute Discord audio on stream in Rameirah voice channels, staff calls and private talks. Nothing heard on Discord may be used in the Empire.",
        "text": "- In any Rameirah Discord voice channel, staff call or private discussion, your Discord audio is muted on stream. Public community meetings are the only exception.\n- If you stay in a Discord voice channel while roleplaying, stay Discord-muted.\n- Using anything from Discord in roleplay is meta gaming and is punished under CRF-02.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Discord",
          "Voice",
          "Metagaming",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-03",
        "number": "CRE-03",
        "title": "No Sniping, No Chat Tips",
        "summary": "Never use another player's stream, or tips from your own chat, in roleplay.",
        "text": "- Watching another player's stream for their location, plans or information is not allowed.\n- Ignore tips, warnings and locations from your viewers. Your character knows only what they saw and heard in the Empire.\n- Recommended: streamers in gangs, crime groups or the police should use a stream delay.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Stream Sniping",
          "Metagaming",
          "Viewers",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-04",
        "number": "CRE-04",
        "title": "Going Dark During Reports",
        "summary": "Mute or end your stream during an FRP report or staff discussion, show nothing of the case on stream until it is closed, and never broadcast private staff matters.",
        "text": "- If you are part of a Fail RP report, staff discussion or rule discussion, mute or end your stream during the discussion or call, and do not show the case on stream until it is closed.\n- Do not stream, record or clip private staff discussions, tickets or punishments without Management's permission.\n\n**Penalty:** whatever action Management decides.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Fail RP",
          "Staff",
          "Recording",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "cre-05",
        "number": "CRE-05",
        "title": "Representing the Empire",
        "summary": "On stream you are the face of Rameirah. Raise problems through tickets, never target players, and keep private and unreleased things off air.",
        "text": "- Behave professionally while live.\n- Raise issues with Management respectfully, through tickets or feedback channels. Publicly attacking the Empire, staff or community on stream is not allowed.\n- Do not insult, harass or target any player on stream. Mute yourself first if you need to vent.\n- Never show a player's real name, personal details or private messages without their consent.\n- Do not leak scripts, vehicles, events or features that have not been announced.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Respect",
          "Privacy",
          "Leaks",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-06",
        "number": "CRE-06",
        "title": "Earning the Streamer Role",
        "summary": "Stream the Empire 30 days in a row, 2 hours a day, with the invite link, tags and logo, then open a ticket with proof.",
        "text": "**Requirements**\n\n- Stream Rameirah Empire for **30 days in a row**, at least **2 hours a day**.\n- Put the official Rameirah Discord invite link in your stream description.\n- Use the tags **#RameirahEmpire #RMR** in your stream title.\n- Show the Rameirah Empire logo on screen.\n- Show good-quality roleplay within the rules.\n\n**Applying.** Open a Support Ticket with proof (VOD links or screenshots).\n\n**Reviews.** Management checks Streamer roles from time to time. Inactive streamers, or those misusing the role, may lose it.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Role",
          "Requirements",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-07",
        "number": "CRE-07",
        "title": "The Content Creator Role",
        "summary": "Our top partner role: 20,000+ followers, 30 days in a row at 3 hours a day, with Rameirah as your only RP server. Given by Management, never requested.",
        "text": "**Requirements**\n\n- At least **20,000 subscribers or followers** on your main platform.\n- Stream Rameirah Empire for **30 days in a row**, at least **3 hours a day**.\n- Use **#RameirahEmpire #RMR** and show the logo on stream.\n- Rameirah Empire is your main and only RP server.\n\nThe role cannot be requested. Management awards it after reviewing your content and reviews it regularly. It can be removed if you stop meeting the requirements or misuse it.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Content Creator",
          "Role",
          "Requirements",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "cre-08",
        "number": "CRE-08",
        "title": "Perks & Losing a Role",
        "summary": "Management can change perks and suspend or remove any creator role. After removal you wait 30 days to reapply.",
        "text": "- Management may change Streamer and Content Creator perks at any time.\n- Management may suspend or remove either role for breaking Codex rules or these guidelines.\n- After removal, you wait **30 days** before reapplying, unless Management decides otherwise.\n\nManagement has the final word on every creator matter.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Perks",
          "Suspension",
          "Revocation",
          "Creators"
        ],
        "division": "",
        "section": "",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      }
    ]
  },
  {
    "id": "premium-plan-guidelines",
    "title": "Premium Plan Guidelines",
    "summary": "Premium plans help pay for running and developing Rameirah Empire. A plan is support for the server, not a purchase of any share or ownership in it. These guidelines cover every plan, and the Individual Premium Plan Guidelines add the rules for standalone plans.",
    "icon": "HeartHandshake",
    "locked": true,
    "lockedDivisions": [],
    "divisions": [
      {
        "name": "Premium Plan Guidelines",
        "sections": []
      },
      {
        "name": "Individual Premium Plan Guidelines",
        "sections": []
      }
    ],
    "updated": "",
    "rules": []
  },
  {
    "id": "entity-rules",
    "title": "Rules for Various Entities",
    "summary": "How players deal with Rameirah Empire's official bodies: the Police (dealing with officers, vehicles, traffic stops, firefights and lockdowns), the Medical Department (respecting and cooperating with the RMD), the Court System (the empire's criminal procedure, its offences, the FIR form, the Bill of Fundamental Rights and the Legislations) and the Gangs (forming and running a gang, dealing with citizens, police and rivals, safe zones and wars).",
    "icon": "ShieldCheck",
    "locked": false,
    "lockedDivisions": [
      "Gang",
      "Court System"
    ],
    "divisions": [
      {
        "name": "Police",
        "sections": [
          "Dealing with Officers",
          "Vehicles & the Police",
          "Traffic Stops",
          "Firefights & Lockdowns"
        ]
      },
      {
        "name": "Medical Department",
        "sections": [
          "About the RMD",
          "Interaction Rules",
          "In-Game Interview Requirements",
          "Radio Codes",
          "Duty Rules"
        ]
      },
      {
        "name": "Court System",
        "sections": [
          "Code of Criminal Procedure (CrPC)",
          "Penal Code",
          "First Information Report (FIR)",
          "Bill of Fundamental Rights",
          "Legislations"
        ]
      },
      {
        "name": "Gang",
        "sections": [
          "Forming, joining and leaving a gang",
          "Gang identity and assets",
          "Interactions with citizens, police and other gangs",
          "Safe zones and gang houses",
          "Situation stages, meetings and wars",
          "Hostages, deaths, crashes, VDM, POV and penalties"
        ]
      }
    ],
    "updated": "2026-11-13",
    "rules": [
      {
        "id": "pd-1-01",
        "number": "PD-1.01",
        "title": "Working with Officers",
        "summary": "Treat officers with respect, don't tell them how to do their job or rush them, and start with whichever officer is available. Respect runs both ways.",
        "text": "Officers are players running their own roleplay, so:\n\n- **Be respectful.** Disrespect the police and they can treat you accordingly in character. Out-of-character conduct still falls under HON-01.\n- **Don't tell them how to do their job.** Officers may read it the wrong way, and not every officer will handle you the same way.\n- **Don't rush them.** They'll process you in their own time.\n- **Start with the officer who's there.** Don't ask for a senior officer to begin your roleplay; if the officer can't help, they'll call one.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Respect",
          "Processing",
          "Senior Officers"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-02",
        "number": "PD-1.02",
        "title": "Quality Roleplay with the Police",
        "summary": "Officers will go along with good communication roleplay. Low-effort roleplay may be cut short.",
        "text": "The police are happy to play along with **good communication roleplay**. Keep it a decent standard; low-effort roleplay may not be carried on.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Quality RP"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-03",
        "number": "PD-1.03",
        "title": "Crimes in Front of Officers",
        "summary": "Commit a crime in front of an officer and you can be arrested, processed and jailed.",
        "text": "Any crime committed in front of an officer can get you **arrested**. The police have the right to **process and jail** you.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Arrest"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-04",
        "number": "PD-1.04",
        "title": "Weapons in Hand",
        "summary": "Holding a weapon in front of an officer lets them cuff you, search you and take weapons and illegal items. Officers give up to 2 warnings first, or none if you aim it.",
        "text": "Keep weapons out of your hands around the police. If you're holding one, an officer can **cuff you, search you and take** weapons and illegal items from your inventory.\n\nOfficers give up to **2 warnings** to put the weapon away. After that, or straight away if you aim it, they can cuff, search and arrest you (CON-04).",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Weapons"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-05",
        "number": "PD-1.05",
        "title": "Masks & Helmets",
        "summary": "Officers may order you to remove a mask or helmet. Refusing is grounds for a search, asset seizure and arrest; whether to refuse is an in-character choice, not a rule break.",
        "text": "Officers may order you to remove a mask or helmet. Refusing is grounds for a **search, asset seizure and arrest**. Whether to refuse is an in-character choice, not a rule break.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Masks"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-06",
        "number": "PD-1.06",
        "title": "Impersonating the Police",
        "summary": "Posing as police or any other law enforcement, by wearing their uniform or driving their vehicles to pose as them, is a direct FRP.",
        "text": "Never pose as a police officer or any other law enforcement, whether by **wearing their uniform** or **driving their vehicles** to pose as police. It isn't roleplay; it's a **direct FRP**. Taking a vehicle to escape is covered by PD-2.02.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Police",
          "Impersonation",
          "Fail RP"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-07",
        "number": "PD-1.07",
        "title": "Taking an Officer Hostage",
        "summary": "An officer can be taken hostage only when 7 or more are on duty and there is a real story reason, and it takes 2 criminals per officer.",
        "text": "An officer can only be taken hostage when there are **7 or more officers on duty** and there is a **real story reason** for it.\n\nIt takes **2 criminals for every officer** taken.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Police",
          "Hostages"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-08",
        "number": "PD-1.08",
        "title": "Officers' Equipment",
        "summary": "Nothing an on-duty officer uses for the job can be stolen: not their guns, not their gear, nothing.",
        "text": "On-duty officers can't be robbed of anything they use for the job: **guns, gear, or anything else**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Theft",
          "Equipment"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-09",
        "number": "PD-1.09",
        "title": "Freeing a Friend",
        "summary": "Don't fight officers to free a friend they've arrested.",
        "text": "Don't fight officers to break a friend out of their custody.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Combat"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-10",
        "number": "PD-1.10",
        "title": "Officer Fear Ratios",
        "summary": "Officers don't have to show fear when the odds are even: one officer can face two opponents with pistols, or one opponent with an AR or SMG. Outnumbered beyond that, they show fear like any citizen.",
        "text": "Officers don't need to show fear when the odds are even. Even odds means **one officer against two opponents armed with pistols**, or **one officer against one opponent with an AR or SMG**. Outnumbered beyond this, officers must show fear like any citizen.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Fear RP",
          "Ratios"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-11",
        "number": "PD-1.11",
        "title": "Officers' Bodies",
        "summary": "Never burn an officer's body. Doing so gets you force-respawned with your inventory cleared.",
        "text": "An officer's body may **never** be burnt, under any circumstances. If you do it, you're **force-respawned with your inventory cleared**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Bodies",
          "Respawn"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-12",
        "number": "PD-1.12",
        "title": "Officers Joining In",
        "summary": "Any on-duty officer may join a situation that develops unexpectedly.",
        "text": "Any on-duty officer may join in when a situation develops unexpectedly.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Backup"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-13",
        "number": "PD-1.13",
        "title": "No War on the Police",
        "summary": "You can't declare war on the police. The police department isn't a gang.",
        "text": "Players can't declare **war** on the police. The police department **isn't a gang**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Gangs"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-14",
        "number": "PD-1.14",
        "title": "Triggering the Police in Safe Zones",
        "summary": "Starting a situation with the police inside a safe zone is a direct FRP and can mean a kick or ban.",
        "text": "Triggering the police inside a safe zone is a **direct FRP** and can get you **kicked or banned**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Safe Zones",
          "Fail RP"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-15",
        "number": "PD-1.15",
        "title": "Uninvolved Citizens",
        "summary": "Once a robbery or situation with the police has started, people who weren't part of it can't join.",
        "text": "Once a robbery or other situation with the police has begun, citizens who **weren't part of it** can't join in.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Third Parties"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-16",
        "number": "PD-1.16",
        "title": "Arrest Warrants",
        "summary": "With a government-issued arrest warrant, the police can arrest you anywhere, safe zones and gang houses included.",
        "text": "If there is a **government-issued arrest warrant** for you, the police can arrest you **anywhere**: inside city limits, in safe zones and in gang houses.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Warrants",
          "Safe Zones"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-17",
        "number": "PD-1.17",
        "title": "Robbers Serve Their Time",
        "summary": "In a roleplay robbery you play the whole situation out, jail time included. In a PvP Robbery the robbers leave without engaging police once it ends (CON-07).",
        "text": "In a roleplay robbery you play the **whole situation** out, including any arrest and **jail time**. In a PvP Robbery the robbers leave without engaging police once it ends (CON-07).",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Robberies",
          "Jail"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-18",
        "number": "PD-1.18",
        "title": "Seized Evidence",
        "summary": "Items taken as evidence when you're processed aren't given back, so don't ask.",
        "text": "Once you're processed and your items are taken as **evidence**, they aren't returned. Don't ask for them back.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Evidence"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-1-19",
        "number": "PD-1.19",
        "title": "Situations in Water",
        "summary": "Don't end a situation in the water. If you end up in it by accident, get back to shore straight away.",
        "text": "Don't end a situation in the water. If you fall in by accident, get back to the shore **straight away**. To escape with a police vehicle, dump the vehicle in water, then swim out of the situation area (PD-2.02).",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Water"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-20",
        "number": "PD-1.20",
        "title": "Complaints After the Scene",
        "summary": "If you think an officer treated you unfairly, finish the scene and raise a ticket afterwards. Contacting staff mid-situation is a direct fail-RP, unless a crash or bug stops you playing.",
        "text": "Think an officer treated you unfairly? Play the scene out in the city, then **raise a ticket afterwards**, including if you believe the officer broke a rule.\n\nContacting an Admin **during** the situation is a **direct fail-RP**, except for a crash or bug that stops you playing (JUS-01).",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Tickets",
          "Admins",
          "Fail RP"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-1-21",
        "number": "PD-1.21",
        "title": "Restarts & the 2:00 AM IST Cutoff",
        "summary": "No new criminal roleplay once a 30-minute restart warning goes out. The police go off duty at 2:00 AM IST; robberies after that are cop baiting. Scenes from before 2:00 AM IST continue only with a senior officer's permission.",
        "text": "- When the server announces a restart in **30 minutes**, stop starting criminal or violent roleplay.\n- The police go **off duty at 2:00 AM IST**. Starting a robbery after that is **cop baiting** (CRF-08) and a **direct FRP**.\n- A scene with the police that began before 2:00 AM IST can only carry on with a **senior officer's permission**, on the **next working day**, at the time the officer sets.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Restarts",
          "Cop Baiting",
          "2:00 AM IST",
          "Senior Officers"
        ],
        "division": "Police",
        "section": "Dealing with Officers",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-2-01",
        "number": "PD-2.01",
        "title": "Stunts & Pitting Near the Police",
        "summary": "No donuts, burnouts or stunts in front of the police, and never pit a police car. Both are cop baiting; stunting can cost you your licence and pitting to start a situation is a direct fail-RP.",
        "text": "- **Donuts, burnouts and stunts** in front of the police are **cop baiting** (CRF-08) and can cost you your **driving licence**.\n- **Pitting police cars**, on patrol or in a chase, is **not allowed**.\n- Starting a situation with the police by **pitting or stunting** is a **direct fail-RP**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Vehicles",
          "Cop Baiting",
          "Pitting",
          "License",
          "Fail RP"
        ],
        "division": "Police",
        "section": "Vehicles & the Police",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-2-02",
        "number": "PD-2.02",
        "title": "Police Vehicles",
        "summary": "A police vehicle may be taken only to escape, then dumped in the water. Taking police vehicles to cause other trouble is cop baiting plus server action.",
        "text": "- A police vehicle may be taken **only to escape**. After the escape you **can't** use it to bargain with or provoke the police again: **dump it in the water** and leave.\n- Stealing or taking over police vehicles in any scene to create unwanted situations, civilian or gang, brings **strict action: cop baiting plus server action**.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Police",
          "Vehicles",
          "Escape",
          "Theft",
          "Cop Baiting"
        ],
        "division": "Police",
        "section": "Vehicles & the Police",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-2-03",
        "number": "PD-2.03",
        "title": "Impounds & Fines",
        "summary": "Using unwanted or premium vehicles to create situations can get the vehicle impounded for up to 3 days and a fine of up to 20 Crore.",
        "text": "The police can **impound a vehicle for up to 3 days** and impose a fine of **up to 20 Crore** when unwanted or premium vehicles are used to create situations.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Vehicles",
          "Impound",
          "Fines"
        ],
        "division": "Police",
        "section": "Vehicles & the Police",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-3-01",
        "number": "PD-3.01",
        "title": "Who Can Be Stopped",
        "summary": "The police can stop any vehicle breaking traffic rules, doctors' vehicles included, except RMD vehicles responding with lights and sirens.",
        "text": "The police can stop **any vehicle** that breaks traffic rules, **doctors' vehicles included**. RMD vehicles responding with lights and sirens are exempt.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Traffic Stops"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-3-02",
        "number": "PD-3.02",
        "title": "How a Stop Is Signalled",
        "summary": "A traffic stop is signalled with a pull-over announcement and emergency lights.",
        "text": "Officers signal a traffic stop with a **pull-over announcement** and **emergency lights**.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Police",
          "Traffic Stops"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-3-03",
        "number": "PD-3.03",
        "title": "Searches at a Stop",
        "summary": "At a traffic stop the police may search you only for a valid reason, and you must cooperate with the officer.",
        "text": "During a traffic stop, the police may search you only with a **valid reason**. You **must cooperate** with the officer on the scene.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Traffic Stops",
          "Searches"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-3-04",
        "number": "PD-3.04",
        "title": "Refusing to Pull Over",
        "summary": "Ignore a stop and the police can chase you, pit you and call in backup.",
        "text": "If you don't pull over, the police can start a **chase**, with **pitting** and **backup units**.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Traffic Stops",
          "Chases",
          "Pitting"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-3-05",
        "number": "PD-3.05",
        "title": "Baiting at Traffic Checks",
        "summary": "Using a traffic check to lure officers into another scene is cop baiting and a direct fail-RP.",
        "text": "Deliberately using a traffic check to lure officers into another scene is **cop baiting** (CRF-08) and a **direct fail-RP**.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Traffic Stops",
          "Cop Baiting",
          "Fail RP"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-3-06",
        "number": "PD-3.06",
        "title": "How a Stop Ends",
        "summary": "A traffic stop ends in a warning or fine, a surrender or an escape. An escape never turns into a gunfight unless the driver or passengers fire first, and only the people in the vehicle take part.",
        "text": "Every traffic stop ends in a **warning or fine**, a **surrender** or an **escape**.\n\nAn escape **can never turn into a gunfight**, unless the driver or passengers fire first, even if it carries on outside the city, and **only the people in the vehicle** may take part in the chase.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Traffic Stops",
          "Escape",
          "Chases"
        ],
        "division": "Police",
        "section": "Traffic Stops",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-4-01",
        "number": "PD-4.01",
        "title": "Lockdown Areas",
        "summary": "Wherever 5 or more police units are in a gunfight, the area is in lockdown. The police don't have to announce it.",
        "text": "An area is in **lockdown** wherever **5 or more police units** are in a gunfight. The police **don't have to announce** a lockdown.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Lockdown"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-4-02",
        "number": "PD-4.02",
        "title": "Section 144 & Code 99",
        "summary": "Section 144 is for crowds the police can no longer control: 3 warnings, usually non-lethal. Code 99 is for an ongoing gunfight: lethal, after a 5-minute chance to clear the area.",
        "text": "The police declare **Section 144** only where an area can no longer be controlled, such as a large crowd disrupting public order. It comes in two forms:\n\n- **Section 144:** an uncontrollable crowd is warned **3 times** to clear the area. Usually **non-lethal**; lethal force is a last resort, after **5 minutes** in total.\n- **Section 144 Code 99:** a gunfight is under way and the police step in to restore order. **Lethal**, after a **5-minute** chance to clear the area.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Section 144",
          "Code 99"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-4-03",
        "number": "PD-4.03",
        "title": "Walking into Gunfire",
        "summary": "Heading into a police lockdown after hearing shots is No Fear RP. Admins can ban on the spot if the POV shows you heard the gunfire or saw the units and went in anyway.",
        "text": "Hearing gunshots and heading into a police lockdown is **No Fear RP**, and a **ban** if the POV shows you did it deliberately.\n\nAdmins can **ban players on the spot** for entering, with further action based on ticket POVs. Bans for entering apply only if the POV shows you heard the gunfire or saw the units and went in anyway.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Police",
          "Lockdown",
          "Fear RP",
          "Bans"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-4-04",
        "number": "PD-4.04",
        "title": "Caught in a Lockdown",
        "summary": "If you are caught in a lockdown, raise your hands and leave. You may not fight the police unless you were part of the situation from the start.",
        "text": "If you are caught in a lockdown, **raise your hands and leave**. You may not fight the police unless you were part of the situation from the start.\n\nRaising your hands means you **surrender** and want no part in it. You must **leave the area** and **not return** under any circumstances.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Lockdown",
          "Surrender"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "pd-4-05",
        "number": "PD-4.05",
        "title": "Staying Out of Other Scenes",
        "summary": "If you weren't part of a situation from the start, you can never join it, even if you were shot at.",
        "text": "If you weren't part of a situation from the start, you **can't join it** under any circumstances, **even if you were shot at**. You chose to go there, so you can't build a new situation out of it.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Police",
          "Third Parties",
          "Lockdown"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-4-06",
        "number": "PD-4.06",
        "title": "Respawning After Firefights",
        "summary": "Apart from robberies, every gunfight ends in a respawn: consignments, 144, money transport and unwanted scenes.",
        "text": "Every gunfight **except robberies** ends in a **respawn**, including consignments, Section 144, money transport and unwanted scenes.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Police",
          "Respawn",
          "Firing Situations"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-10-29",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "pd-4-07",
        "number": "PD-4.07",
        "title": "Unwanted Situations with the Police",
        "summary": "Starting unwanted situations with the police brings heavy fail-RP action, and a spot kick if it gets out of hand.",
        "text": "Starting **unwanted situations** with the police (see CRF-08 for cop baiting) brings **heavy fail-RP action**, and a **kick on the spot** if it can't be brought under control in the city.",
        "severity": "critical",
        "level": "zero",
        "tags": [
          "Police",
          "Fail RP",
          "Kicks"
        ],
        "division": "Police",
        "section": "Firefights & Lockdowns",
        "effective": "2026-10-27",
        "updated": "2026-11-13",
        "version": 3,
        "penalty": ""
      },
      {
        "id": "rmd-00",
        "number": "RMD-00",
        "title": "Rameirah Medical Department (RMD)",
        "summary": "The RMD provides emergency medical care across Rameirah Empire. All players must respect RMD personnel and cooperate during medical scenarios.",
        "text": "The Rameirah Medical Department (RMD) provides emergency medical care across Rameirah Empire and ensures realistic medical roleplay. All players must respect RMD personnel and cooperate during medical scenarios.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Overview"
        ],
        "division": "Medical Department",
        "section": "About the RMD",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-01",
        "number": "RMD-01",
        "title": "Respect RMD",
        "summary": "RMD personnel are a neutral faction: treat them with respect and do not insult, troll or disrupt their roleplay.",
        "text": "- RMD personnel are a neutral faction and must be treated with respect.\n- Do not insult, troll, or intentionally disrupt RMD roleplay.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Respect"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-02",
        "number": "RMD-02",
        "title": "Follow RMD Instructions",
        "summary": "Cooperate with RMD during treatment and transport, and follow medical instructions unless your character has a valid RP reason not to.",
        "text": "- Cooperate with RMD during treatment and transport.\n- Follow medical instructions unless your character has a valid RP reason not to.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Cooperation",
          "Treatment"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-03",
        "number": "RMD-03",
        "title": "Do Not Interrupt Treatment",
        "summary": "Do not interfere while RMD are treating a patient, and give them enough space for their medical roleplay.",
        "text": "- Do not interfere while RMD are treating a patient.\n- Give RMD enough space to perform medical roleplay.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Treatment"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-04",
        "number": "RMD-04",
        "title": "Active Scenes",
        "summary": "Do not force RMD into active gunfights; wait until the scene is secured, and let Police secure the area before RMD enters.",
        "text": "- Do not force RMD into active gunfights or dangerous situations.\n- Wait until the scene is secured before requesting medical assistance.\n- Allow Police to secure the area before RMD enters.\n- After 2:00 AM IST, when the police are off duty, RMD may enter once the Admins confirm the scene is over.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Gunfights",
          "Police"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "rmd-05",
        "number": "RMD-05",
        "title": "Fake Medical Calls",
        "summary": "Do not make fake or prank emergency calls; calling RMD without a legitimate RP reason may result in server punishment.",
        "text": "- Do not make fake or prank emergency calls.\n- Calling RMD without a legitimate RP reason may result in server punishment.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Calls",
          "Punishment"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-06",
        "number": "RMD-06",
        "title": "Protect RMD Neutrality",
        "summary": "Do not force RMD to take sides in criminal or police situations, or use RMD vehicles or personnel as cover in shootouts.",
        "text": "- Do not force RMD to take sides in criminal or police situations.\n- Do not use RMD vehicles or personnel as cover during shootouts.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Neutrality",
          "Police",
          "Shootouts"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-07",
        "number": "RMD-07",
        "title": "RMD Vehicles",
        "summary": "Do not steal, damage or block RMD vehicles, and yield to ambulances responding with lights and sirens whenever possible.",
        "text": "- Do not steal, damage, or block RMD vehicles.\n- Yield to ambulances responding with lights and sirens whenever possible.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Vehicles",
          "Ambulance"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-08",
        "number": "RMD-08",
        "title": "During Treatment",
        "summary": "Do not walk away, drive off or combat log while receiving treatment; stay in roleplay until RMD has finished treatment or transport.",
        "text": "- Do not walk away, drive off, or combat log while receiving medical treatment.\n- Remain in roleplay until RMD has completed treatment or transport.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Treatment",
          "Combat Logging"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-09",
        "number": "RMD-09",
        "title": "Revive Expectations",
        "summary": "A revive is not guaranteed: RMD decide the treatment from the roleplay and server rules, and will not treat a player while they are being carried.",
        "text": "- A revive is not guaranteed.\n- RMD will decide the appropriate medical treatment based on the roleplay scenario and server rules.\n- Respect the outcome of the medical roleplay.\n- RMD will not treat a player while they are being carried. Put them down and step back first.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Revive",
          "Dead Carry"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "rmd-10",
        "number": "RMD-10",
        "title": "Injuries",
        "summary": "Roleplay your injuries realistically: do not recover instantly from severe injuries, and keep roleplaying pain or limitations when appropriate.",
        "text": "- Roleplay your injuries realistically.\n- Do not instantly recover after receiving treatment if your injuries are severe.\n- Continue to roleplay pain or limitations when appropriate.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Injuries",
          "Roleplay"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-11",
        "number": "RMD-11",
        "title": "Hospital Conduct",
        "summary": "Respect hospital staff and patients; no fighting, trolling or disturbances inside the hospital.",
        "text": "- Respect hospital staff and patients.\n- No fighting, trolling, or causing disturbances inside the hospital.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Hospital"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 2,
        "penalty": ""
      },
      {
        "id": "rmd-12",
        "number": "RMD-12",
        "title": "No Abuse of RMD Services",
        "summary": "Do not repeatedly call RMD for non-emergencies or intentionally waste their resources or time.",
        "text": "- Do not repeatedly call RMD for non-emergency situations.\n- Do not intentionally waste RMD resources or time.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Calls",
          "Resources"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-13",
        "number": "RMD-13",
        "title": "Kidnapping or Robbing RMD",
        "summary": "RMD personnel may not be kidnapped, robbed or harmed for any RP reason, and random attacks on RMD are strictly prohibited.",
        "text": "- RMD personnel may not be kidnapped, robbed, or harmed for any RP reason.\n- Random attacks on RMD are strictly prohibited.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Kidnapping",
          "Robbery"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-14",
        "number": "RMD-14",
        "title": "OOC Conduct",
        "summary": "Do not argue with RMD staff over treatment decisions during RP; finish the roleplay first and report any issue to server staff afterward.",
        "text": "- Do not argue with RMD staff over treatment decisions during RP.\n- If you believe an issue occurred, complete the roleplay first and report it to server staff afterward.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "OOC",
          "Reports"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-15",
        "number": "RMD-15",
        "title": "Failure to Follow These Rules",
        "summary": "Failing to cooperate with RMD, disrupting medical roleplay or abusing RMD services may result in disciplinary action from the server.",
        "text": "Failure to cooperate with RMD, intentionally disrupting medical roleplay, or abusing RMD services may result in disciplinary action from the server.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Punishment"
        ],
        "division": "Medical Department",
        "section": "Interaction Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-12",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-16",
        "number": "RMD-16",
        "title": "In-Game Interview Requirements",
        "summary": "What an RMD in-game interview requires: valid ID proof, a driving license, knowledge of the RMD radio calls and rules, and strict formal business attire. Only citizens may apply; gang members may not.",
        "text": "**Requirements & eligibility**\n\n- Valid ID proof.\n- Driving license.\n- You have to know all the RMD radio calls (see RMD-17) and the RMD rules.\n- Dress code: strict formal business attire.\n\n**Note:** Only Citizens are eligible. Members of Gangs are NOT permitted to apply.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Interview",
          "Requirements",
          "Eligibility"
        ],
        "division": "Medical Department",
        "section": "In-Game Interview Requirements",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-17",
        "number": "RMD-17",
        "title": "RMD Radio Codes",
        "summary": "The RMD radio codes, from 10-2 (arrived on scene) to 10-70 (negative). Every applicant has to know them (RMD-16).",
        "text": "| Code | Meaning |\n| --- | --- |\n| 10-2 | Arrived on scene |\n| 10-3 | On the way |\n| 10-4 | Copy That |\n| 10-5 | Break |\n| 10-6 | DND or Busy |\n| 10-7 | Off duty |\n| 10-8 | On duty |\n| 10-9 | Repeat |\n| 10-20 | Location |\n| 10-33 | Request Medical Emergency (From PD) |\n| 10-41 | Ambulance Needed |\n| 10-50 | Backup |\n| 10-60 | Vehicle Lost |\n| 10-70 | Negative |",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Radio",
          "Codes",
          "Interview"
        ],
        "division": "Medical Department",
        "section": "Radio Codes",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-18",
        "number": "RMD-18",
        "title": "No Illegal Activity",
        "summary": "Medics may not take part in illegal activities such as robberies or smuggling, or help gangs during situations.",
        "text": "Medics are not allowed to engage in any illegal activities like Robberies, smuggling or helping gangs during situations.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Crime",
          "Gangs"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-19",
        "number": "RMD-19",
        "title": "Medical Equipment",
        "summary": "Bandages, medkits and other equipment are for patient care only. Selling, trading or handing them out is grounds for removal from duty.",
        "text": "Bandages, medkits, and other equipment are strictly for patient care only. Selling, trading, or handing them out is grounds for removal from duty.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Equipment",
          "Removal"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-20",
        "number": "RMD-20",
        "title": "Minimum Units & Duty Hours",
        "summary": "At least 3 RMD units must be active in the city at any time. Duty time is from 8 AM to 12:00 AM.",
        "text": "RMD Units must be active within the city with a minimum of 3 Units at a given time. Duty time will be from 8 AM to 12:00 AM.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Units",
          "Hours"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-21",
        "number": "RMD-21",
        "title": "Lockers & Stockpiling",
        "summary": "Do not hide or stockpile items personally. Return every item to the EMS locker when going off duty.",
        "text": "Do not hide or stockpile any of the items personally, and all the items must be kept back in the EMS locker while going OFF-Duty.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Equipment",
          "Locker"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-22",
        "number": "RMD-22",
        "title": "Parking EMS Vehicles",
        "summary": "Park every EMS vehicle back in the EMS Garage; never abandon one in the city.",
        "text": "All the EMS Vehicles should be parked back in the EMS Garage and do not abandon the vehicle anywhere in the city.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Vehicles",
          "Garage"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-23",
        "number": "RMD-23",
        "title": "Uniform & Vehicles",
        "summary": "Wear the medical uniform at all times on duty, and use only authorised ambulances and vehicles.",
        "text": "While on-duty you should wear medical uniform at all times. Use only authorized ambulances and vehicles.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Uniform",
          "Vehicles"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-24",
        "number": "RMD-24",
        "title": "Medical Radio",
        "summary": "Stay connected to the medical radio during your shift and coordinate with your team at every case or scene.",
        "text": "Stay connected to the medical radio during your shift. Coordinate with your team regularly while attending a case or scene.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Radio",
          "Teamwork"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-25",
        "number": "RMD-25",
        "title": "Leave & Inactivity Notice",
        "summary": "Tell your department leads in advance if you will be inactive or on leave for a long time. Sudden absences without notice may lead to removal.",
        "text": "If you are to be inactive or go on leave for an extended period of time, notify your department leads in advance. Sudden absences without notice may lead to removal.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Inactivity",
          "Leave"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-26",
        "number": "RMD-26",
        "title": "Lights & Sirens",
        "summary": "Use lights and sirens only when responding to urgent calls.",
        "text": "Lights and sirens should be used only when responding to urgent calls.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Vehicles",
          "Sirens"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-27",
        "number": "RMD-27",
        "title": "No Crime on Duty",
        "summary": "No medic may commit, assist or cover crimes while on duty, in uniform or using department vehicles.",
        "text": "No medic should commit, assist, or cover crimes while on duty, in uniform, or using department vehicles.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Crime",
          "Uniform"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-28",
        "number": "RMD-28",
        "title": "Ambulance Use & Civilians",
        "summary": "Ambulances are for patient transport and emergencies only. Civilians may not ride along without prior approval from supervisors.",
        "text": "Ambulances are strictly for patient transport and emergencies. Civilians are not allowed to accompany the medics without prior approval from supervisors.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Ambulance",
          "Civilians"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-29",
        "number": "RMD-29",
        "title": "Restocking Supplies",
        "summary": "Restock medical supplies regularly; running out during an emergency is unprofessional and avoidable.",
        "text": "Restock medical supplies regularly. Running out during emergencies is unprofessional and avoidable.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Supplies",
          "Equipment"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-30",
        "number": "RMD-30",
        "title": "Respect & Conduct",
        "summary": "Treat all players and staff with respect. Harassment, discrimination and hate speech are not tolerated.",
        "text": "Treat all players and staff with respect. No harassment, discrimination, or hate speech will be tolerated.",
        "severity": "medium",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Respect",
          "Conduct"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-31",
        "number": "RMD-31",
        "title": "Polite Replies",
        "summary": "When you reply in chat, address people politely.",
        "text": "In case you are giving a reply in the chat, please make sure to address them in a polite manner.",
        "severity": "low",
        "level": "standard",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Chat",
          "Respect"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      },
      {
        "id": "rmd-32",
        "number": "RMD-32",
        "title": "Inactivity & Second Characters",
        "summary": "Inactivity without a proper reason in a Government Job means removal after a warning and character deletion. Abusing a 2nd EMS character, or severely breaking a job's rules, means a blacklist.",
        "text": "If we find that you have been inactive without any proper reason in the Government Job you've been accepted into, you will be removed after an initial warning and your Character will be deleted.\n\nIf you are abusing the privilege of having a 2nd Character in EMS, you will be Blacklisted from gaining any additional Characters and from re-applying for the 2nd Character after it's deleted.\n\nYou will be Blacklisted from applying for any Government Jobs if you disrespect and severely violate the rules and procedures of the concerned Government Job.",
        "severity": "high",
        "level": "serious",
        "tags": [
          "Medical Department",
          "RMD",
          "Duty",
          "Inactivity",
          "Characters",
          "Blacklist"
        ],
        "division": "Medical Department",
        "section": "Duty Rules",
        "effective": "2026-11-12",
        "updated": "2026-11-13",
        "version": 1,
        "penalty": ""
      }
    ]
  }
]
