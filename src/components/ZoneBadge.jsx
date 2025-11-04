import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ZoneBadge = ({ zone, className }) => {
  const getZoneConfig = (zone) => {
    switch (zone) {
      case "green":
        return {
          label: "Green Zone",
          // Stronger, more legible styling
          className: "bg-zone-green text-white border-zone-green hover:bg-zone-green/90",
        };
      case "yellow":
        return {
          label: "Yellow Zone",
          className: "bg-zone-yellow text-black border-zone-yellow hover:bg-zone-yellow/90",
        };
      case "red":
        return {
          label: "Red Zone",
          className: "bg-zone-red text-white border-zone-red hover:bg-zone-red/90",
        };
      default:
        return {
          label: "Unknown",
          className: "bg-muted text-muted-foreground",
        };
    }
  };

  const config = getZoneConfig(zone);

  return (
    <Badge
      variant="default"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};

export default ZoneBadge;

