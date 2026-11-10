# Design note: a 60-second arithmetic sprint

**The choice.** A player has 60 seconds to solve as many simple arithmetic problems as they can, typed one at a time on a keyboard or an on-screen keypad. The score is the number solved.

## 1. Which game, and why

**The evidence.** People improve at what they practise, and little carries over [1][2]. Six weeks of training in 11,430 adults improved every trained task, but "no evidence was found for transfer effects to untrained tasks, even when those tasks were cognitively closely related" [1]. The strongest positive trial, ACTIVE, found fewer dementia diagnoses 20 years after speed training with booster sessions [3], yet its authors drew "a main lesson": "the benefits of cognitive training are specific to the cognitive ability trained" [4]. **So the rule is: choose a task worth getting better at for its own sake.** Mental arithmetic is one.

**The market.** I checked each type of game against this brief: a one- to two-minute round, a result the server can check, keyboard or touch, a score that moves with practice. Unsourced verdicts are my judgement.

| Game type and examples | Measures | Verdict |
|---|---|---|
| **Arithmetic sprint**: Brain Age "Calculations × 20" [5], Lumosity Raindrops [6], Zetamac [7] | Calculation speed | **Chosen** |
| Pattern memory: Lumosity Memory Matrix [6], Human Benchmark Visual Memory [8] | Visual memory | Fair across devices, but it improved least of four Lumosity tasks [9], and a phone photo beats it [10] |
| Sequence and digit span: Human Benchmark [8] | Memory span | A reliable test takes about 5 minutes and barely changes with practice [11]; notes beat it [10] |
| Stroop, flanker: Lumosity Color Match [6] | Attention | Reliabilities of only .40 to .66 from 720 trials [12]; browsers time responses about 80 ms late [13] |
| n-back: Lumosity Memory Match [9] | Working memory | Hard to learn; "insufficient reliability" as a measure [14] |

**Why arithmetic.**

1. The skill is useful: "you got faster at arithmetic" is an honest and worthwhile claim.
2. It is hard to cheat by hand. A study of unsupervised testing concluded that in memory tasks "cheating may be particularly easy", and its authors knew of "no known cheating strategies" for speed tasks [10].
3. The score is in plain units, problems per minute, and it moves: Lumosity users improved at its arithmetic game over 25 sessions [9].
4. The format is proven: a core Brain Age exercise [5], the whole of Zetamac [7], and a timed subtest of the WAIS-IV intelligence test [15].

**Weaknesses.** Typing speed is part of the score, and people on phones are slower on timed tests [16]. Timed arithmetic puts some people off: "People who are highly math anxious avoid math" [17], so the problems are kept easy. Evidence that such a game improves anything else is thin: two 32-person trials of Brain Age, with its creator among the authors [18].

## 2. Scoring fairly

- **Score:** problems solved in 60 seconds. "Good" means above your own usual pace; no norms are claimed.
- **Mistakes:** a wrong answer is recorded and the problem stays, so a mistake costs time and nothing can be skipped.
- **The same test every time,** so days are comparable: the four operations in equal shares, additions of two numbers from 2 to 50, multiplications of two from 2 to 12, and subtractions and divisions that are those in reverse (Zetamac's rule [7], which keeps answers whole and positive; the ranges are my choice).
- **The server is the authority.** It creates the problems, the browser returns every attempt (problem, answer, time), and the server replays them to compute the score. "Client-side validation is bypassable" [19].

| Case | Treatment |
|---|---|
| Impossible speed | A correct answer under 300 ms after its problem appeared does not count. Valid responses "should not start before 100–200 ms" [20]; the 300 ms is my judgement |
| Impossible results | One result per round. Rejected if it arrives before 60 seconds have passed on the server's clock, or over a minute late. Attempts must be in order |
| Keyboard or touch | Each round stores the input type and the chart marks it. Comparing people's response times "is unwise for web-based data" [21], so players are compared only with themselves |

**What cannot be prevented.** The browser must be given the problems, so a script can answer them at a human-looking pace. The defence is low stakes: scores are private, never ranked and never rewarded, because rewards tied to performance increased cheating in one study [22].

## 3. What brings people back

- **One minute, then feedback about the task:** your score against your usual pace, and your slowest problems. Feedback works better close to the task than close to the self [23].
- **A specific goal with slack:** practise on 3 days this week, on a calendar like Brain Age's daily stamps [5]. Specific, challenging goals with visible progress beat "do your best" [24], goals with slack led to more persistence than easier or harder ones [25], and a visible broken streak lowers later engagement [26]. There are no streaks, leaderboards or reminders.

## 4. Showing progress

- **Headline: your usual pace,** the median of your last five rounds, so one bad round cannot move it. Oura does the same with a "recent 14-day average" against a long-term one [27].
- **The chart:** a dot per round, a line for the usual pace, the change from your own first five rounds, and seconds per problem for each operation.
- **Only against yourself:** a percentile "depends on who you are compared to" [28].
- **Said in the app:** the score shows practice at arithmetic, not intelligence or health.

## Sources

Opened on 10 November 2026. "Abstract only" marks papers read only in abstract.

1. Owen et al. (2010). Putting brain training to the test. *Nature*. https://pmc.ncbi.nlm.nih.gov/articles/PMC2884087/
2. Simons et al. (2016). Do "brain-training" programs work? *Psychological Science in the Public Interest* (abstract only). https://pubmed.ncbi.nlm.nih.gov/27697851/
3. Coe et al. (2026). Impact of cognitive training on claims-based diagnosed dementia over 20 years: evidence from the ACTIVE study. *Alzheimer's & Dementia: Translational Research & Clinical Interventions*. https://pmc.ncbi.nlm.nih.gov/articles/PMC12884427/
4. Rebok et al. (2014). Ten-year effects of the ACTIVE cognitive training trial on cognition and everyday functioning in older adults. *Journal of the American Geriatrics Society*. https://pmc.ncbi.nlm.nih.gov/articles/PMC4055506/
5. Wikipedia. Brain Age: Train Your Brain in Minutes a Day! https://en.wikipedia.org/wiki/Brain_Age:_Train_Your_Brain_in_Minutes_a_Day!
6. Lumosity. Brain games. https://www.lumosity.com/en/brain-games/
7. Zetamac. Arithmetic Game. https://arithmetic.zetamac.com/
8. Human Benchmark. https://humanbenchmark.com/
9. Sternberg et al. (2013). The largest human cognitive performance dataset reveals insights into the effects of lifestyle factors and aging. *Frontiers in Human Neuroscience*. The data are Lumosity's own. https://pmc.ncbi.nlm.nih.gov/articles/PMC3687527/
10. Scherrer et al. (2025). Effects of proctoring on online intelligence measurement. *Journal of Intelligence*. https://pmc.ncbi.nlm.nih.gov/articles/PMC12470963/
11. Woods, Wyma, Herron & Yund (2016). The effects of repeat testing, malingering, and traumatic brain injury on computerized measures of visuospatial memory span. *Frontiers in Human Neuroscience*. https://pmc.ncbi.nlm.nih.gov/articles/PMC4700270/
12. Hedge, Powell & Sumner (2018). The reliability paradox. *Behavior Research Methods*. https://pmc.ncbi.nlm.nih.gov/articles/PMC5990556/
13. Anwyl-Irvine, Dalmaijer, Hodges & Evershed (2021). Realistic precision and accuracy of online experiment platforms, web browsers, and devices. *Behavior Research Methods*. https://pmc.ncbi.nlm.nih.gov/articles/PMC8367876/
14. Jaeggi, Buschkuehl, Perrig & Meier (2010). The concurrent validity of the N-back task as a working memory measure. *Memory* (abstract only). https://pubmed.ncbi.nlm.nih.gov/20408039/
15. Wikipedia. Wechsler Adult Intelligence Scale. https://en.wikipedia.org/wiki/Wechsler_Adult_Intelligence_Scale
16. Passell et al. (2021). Cognitive test scores vary with choice of personal digital device. *Behavior Research Methods*. https://pmc.ncbi.nlm.nih.gov/articles/PMC8568735/
17. Ashcraft & Krause (2007). Working memory, math performance, and math anxiety. *Psychonomic Bulletin & Review* (abstract only). https://pubmed.ncbi.nlm.nih.gov/17694908/
18. Nouchi et al. (2012, 2013). Two randomised trials of Brain Age against Tetris. *PLoS One* (abstracts only). https://pubmed.ncbi.nlm.nih.gov/22253758/ and https://pubmed.ncbi.nlm.nih.gov/23405164/
19. OWASP. Input Validation Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
20. Berger & Kiefer (2021). Comparison of different response time outlier exclusion methods: a simulation study. *Frontiers in Psychology*. https://pmc.ncbi.nlm.nih.gov/articles/PMC8238084/
21. Bridges, Pitiot, MacAskill & Peirce (2020). The timing mega-study: comparing a range of experiment generators, both lab-based and online. *PeerJ*. https://pmc.ncbi.nlm.nih.gov/articles/PMC7512138/
22. Diedenhofen & Musch (2017). PageFocus: using paradata to detect and prevent cheating on online achievement tests. *Behavior Research Methods* (abstract only). https://pubmed.ncbi.nlm.nih.gov/27573006/
23. Kluger & DeNisi (1996). The effects of feedback interventions on performance. *Psychological Bulletin* (read in a copy hosted elsewhere). https://doi.org/10.1037/0033-2909.119.2.254
24. Locke & Latham (2002). Building a practically useful theory of goal setting and task motivation. *American Psychologist* (read in a copy hosted elsewhere). https://doi.org/10.1037/0003-066X.57.9.705
25. Sharif & Shu (2017). The benefits of emergency reserves. *Journal of Marketing Research* (abstract only). https://doi.org/10.1509/jmr.15.0231
26. Silverman & Barasch (2023). On or off track: how (broken) streaks affect consumer decisions. *Journal of Consumer Research* (accepted manuscript). https://udspace.udel.edu/handle/19716/34160
27. Oura. Readiness Score. https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score
28. BrainHQ. Update on BrainHQ: progress changes. https://www.brainhq.com/updates/update-on-brainhq-progress-changes/
