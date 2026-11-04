# Kaiju Tracker

This is a simple checklist of kaiju movies, shows, games, and figures. The website reads four text files. You update those files. You do not need to know how to code.

The page is meant to be linked from the X bio for [@kaijuinvestor](https://x.com/kaijuinvestor).

## Turn the website on (one time)

The site is already in this repository. GitHub still has to be told to publish it.

1. Open the **steepedsky/kaiju-tracker** repository on GitHub.
2. Open **Settings**, then **Pages**.
3. Under **Build and deployment**, set the branch to **main** and the folder to **/ (root)**.
4. Save.

Give it a minute. The address will show on that same settings page. It should be:

https://steepedsky.github.io/kaiju-tracker/

Anyone with the link can look. Only someone who can edit this repository can change the lists.

## The four files

| File | What it is | Status words |
| --- | --- | --- |
| `movies.csv` | Films | `seen` or `unseen` |
| `tv.csv` | TV and anime | `seen` or `unseen` |
| `games.csv` | Games | `played` or `unplayed` |
| `figures.csv` | Figures you own or want | `owned` or `wishlist` |

Each file is plain text. The first line names the columns. Leave that line alone. Every line under it is one title:

```
title,year,group,status,rating,notes
```

- **title** is the name.
- **year** is the release year. You can leave it blank.
- **group** is the bucket the filter uses (Showa, Heisei, Anime, and so on). You can type a new group. It will show up in the filter.
- **status** is one of the words in the table above. Use lowercase.
- **rating** is blank, or a number from 1 to 5.
- **notes** is anything you want to remember. Leave it blank if you have nothing to add.

A movie line looks like this:

```
Godzilla vs. Destoroyah,1995,Heisei,unseen,,
```

After you have seen it and want to rate it:

```
Godzilla vs. Destoroyah,1995,Heisei,seen,4,Heisei finale
```

That second line is only an example of the shape. Change the real line that is already in the file. Do not add a second copy.

If a title or a note contains a comma, keep quotes around that piece, like the file already does for *Ghidorah, the Three-Headed Monster*. Spaces right after a comma are fine.

## Check something off from your phone

1. Open the GitHub app and go to this repository.
2. Tap `movies.csv`, `tv.csv`, or `games.csv`.
3. Tap the pencil (Edit).
4. Find the line. Change `unseen` to `seen`, or `unplayed` to `played`.
5. Save. The button says **Commit changes**. Commit directly to the **main** branch.

On a computer, open the file on github.com, click the pencil, edit, then **Commit changes** directly to **main**.

The website updates within a minute or two after you save. Refresh the page. If the old list is still there, wait a moment and refresh again.

## Rate something, or add a note

On the same line, put `1`, `2`, `3`, `4`, or `5` in the rating spot. Leave that spot empty if you do not want a rating. Type a note at the end of the line if you want one.

```
Shin Godzilla,2016,Reiwa,seen,5,First one I saw in a theater
```

## Add a figure

`figures.csv` starts with a sample row called `EXAMPLE - delete this row`. Delete that whole line when you add a real one. It is not a figure you own.

Add one new line per figure. `owned` means it is on your shelf. `wishlist` means you want it. The group can be the line or maker, whatever is useful to filter on.

```
S.H.MonsterArts Godzilla (1954),2023,S.H.MonsterArts,owned,,
```

That line is a made-up example of the format. Use the name of a figure you actually have or want.

## Add a movie, show, or game

Copy an existing line, paste it underneath, and change the words. Keep the six spots in the same order. The new group name, if you invent one, shows up in the filter by itself.

Do not edit `index.html` or the picture in `img` unless you mean to change the website itself. The lists are the csv files.
