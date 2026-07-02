# Workflow di sviluppo — regole per non regredire

> Modello **trunk-based**: `main` è l'unica fonte di verità. Vercel deploya solo `main`.
> Queste regole nascono dalle regressioni del 2 luglio 2026 (branch datati mergiati con
> `--ours`, worktree e cache vecchie che mostravano versioni superate).

## Le 6 regole

### 1. Lavora su `main`, o su branch che vivono meno di un giorno
Più un branch resta aperto, più `main` gli va avanti e più diverge. Il drift è la causa
numero uno delle regressioni. Commit piccoli e frequenti direttamente su `main`.

### 2. Mai `--ours` / `--theirs` alla cieca nei merge
Se un merge dà conflitti, **guarda ogni file** e tieni la versione giusta.
Risolvere i conflitti "a blocco" con `--ours` fa sovrascrivere codice nuovo con codice vecchio.
Prima di mergiare un branch: `git merge origin/main` DENTRO il branch e risolvi lì.

### 3. Dopo il merge, cancella subito branch e worktree
```bash
git branch -d claude/<nome>          # branch locale
git push origin --delete claude/<nome>   # branch remoto
git worktree remove .claude/worktrees/<nome>
```
Niente branch mergiati che restano in giro da ripescare per errore.

### 4. Un solo worktree alla volta (o nessuno)
Ogni worktree è una cartella separata con la propria cache `.next`. Più worktree =
non si capisce quale directory serve il sito = si vedono versioni vecchie.
Se non serve isolamento, lavora nel repo principale.

### 5. Un solo dev server, sempre dal repo principale
```bash
cd ~/Desktop/open\ code\ -\ ai\ act\ saas/aicomply
npm run dev -- --webpack        # SEMPRE --webpack (Turbopack crasha su Next 16)
```
Se vedi una versione vecchia dopo un push: ferma il server, `rm -rf .next`, riavvia,
hard refresh (Cmd+Shift+R).

### 6. `tsc` e Vercel sono la rete di sicurezza
Prima di pushare: `npx tsc --noEmit`. Se passa, i tipi sono a posto.
Vercel blocca il deploy se il build fallisce — non ignorare mai un build rosso.

## Checklist rapida prima di ogni push
- [ ] `npx tsc --noEmit` verde
- [ ] Commit su `main` (o branch < 1 giorno allineato a `main`)
- [ ] Se ho mergiato un branch: conflitti risolti a mano, non con `--ours`
- [ ] Branch/worktree usati e finiti → cancellati
