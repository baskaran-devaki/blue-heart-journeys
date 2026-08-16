import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pickKuralOfDay } from "@/lib/bhg";
import thiruvalluvar from "@/assets/thiruvalluvar.png";

export function KuralFooter() {
  const { data } = useQuery({
    queryKey: ["thirukkural"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thirukkural")
        .select("id, number, kural, explanation, scheduled_date")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 60_000,
  });

  const kural = pickKuralOfDay(data ?? []);

  return (
    <footer className="mt-6 px-3 pb-4">
      <div className="glass rounded-3xl p-4">
        <div className="flex gap-3">
          <img
            src={thiruvalluvar}
            alt="திருவள்ளுவர்"
            loading="lazy"
            width={96}
            height={96}
            className="glow-sm size-20 shrink-0 self-start rounded-2xl bg-secondary/40 object-cover"
          />
          <div className="min-w-0">
            <p className="tamil text-sm font-semibold text-gradient-blue">📖 இன்றைய திருக்குறள்</p>
            {kural ? (
              <>
                <p className="tamil mt-2 text-sm leading-relaxed whitespace-pre-line">
                  {kural.kural}
                </p>
                <p className="tamil mt-2 text-xs leading-relaxed text-muted-foreground">
                  {kural.explanation}
                </p>
                {kural.number ? (
                  <p className="tamil mt-1 text-[10px] text-muted-foreground">
                    குறள் எண்: {kural.number}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="tamil mt-2 text-xs text-muted-foreground">
                குறள் விரைவில் சேர்க்கப்படும்...
              </p>
            )}
          </div>
        </div>
        <p className="tamil mt-4 border-t border-glass-border pt-3 text-center text-[11px] text-muted-foreground">
          💙 BLUE HEART GUYS • நட்பு • பயணம் • நினைவுகள் • ஒற்றுமை
        </p>
      </div>
    </footer>
  );
}
