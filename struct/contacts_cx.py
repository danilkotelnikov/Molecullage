# ChimeraX script used by struct/contacts.py. Run through struct/run_cx.py (a window opens).
#   mode=addh      pdb=in.pdb out=out.pdb      add hydrogens with ChimeraX (hbond-optimised) and save a PDB; Arpeggio reads it next
#   mode=contacts  pdb=in.pdb binder=A antigen=L out=out.json      hydrogen bonds and close contacts between the two sets
# Contacts output: {"version": ..., "atoms": [{binder_chain, binder_num, binder_atom, antigen_chain, antigen_num, antigen_atom, distance, types}]}
# with types "hbond" for a ChimeraX hydrogen bond and "none" for a close contact (ChimeraX does not classify the rest).
import json
import os
import sys
import traceback

from chimerax.core.commands import run

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import style as ST  # noqa: E402


def heavy(atom):
    """A hydrogen is replaced by the heavy atom it is bonded to."""
    return atom.neighbors[0] if atom.element.name == "H" and atom.neighbors else atom


def pair_rows(pbs, binder, antigen, kind):
    rows = []
    for pb in pbs:
        a, b = (heavy(x) for x in pb.atoms)
        if a.element.name == "H" or b.element.name == "H":
            continue
        d = round(float(((a.coord - b.coord) ** 2).sum() ** 0.5), 2)
        for x, y in ((a, b), (b, a)):
            if x.residue.chain_id in binder and y.residue.chain_id in antigen:
                rows.append(dict(binder_chain=x.residue.chain_id, binder_num=x.residue.number, binder_atom=x.name,
                                 antigen_chain=y.residue.chain_id, antigen_num=y.residue.number, antigen_atom=y.name,
                                 distance=d, types=kind))
    return rows


def main(session):
    _, kv = ST.parse_args(sys.argv[1:])
    run(session, "close")
    run(session, f"open {kv['pdb']}")
    if kv["mode"] == "addh":
        run(session, "delete solvent; delete ions")
        run(session, "addh hbond true")
        run(session, f"save {kv['out']} models #1")
        import chimerax.core as core

        open(kv["out"] + ".version", "w").write(core.version)
        return
    import chimerax.core as core

    binder, antigen = kv["binder"].split(","), kv["antigen"].split(",")
    run(session, "delete solvent; delete ions; addh hbond true")
    b, a = "/" + ",".join(binder), "/" + ",".join(antigen)
    m = session.models[0]
    run(session, f"hbonds {b} restrict {a} reveal true name _hb log false")
    g = m.pseudobond_group("_hb", create_type=None)
    hb = list(g.pseudobonds) if g else []
    run(session, f"contacts {b} restrict {a} distanceOnly 4.5 reveal false name _ct log false")
    g = m.pseudobond_group("_ct", create_type=None)
    ct = list(g.pseudobonds) if g else []
    rows = pair_rows(hb, binder, antigen, "hbond") + pair_rows(ct, binder, antigen, "none")
    json.dump({"version": core.version, "atoms": rows}, open(kv["out"], "w"), indent=1)


try:
    main(session)  # noqa: F821
except BaseException:
    open(os.path.join(HERE, "last_error_contacts_cx.txt"), "w").write(traceback.format_exc())
run(session, "exit")  # noqa: F821
