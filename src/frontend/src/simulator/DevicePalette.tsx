import { DeviceIcon } from "./DeviceIcon";
import { DEVICE_CONFIGS } from "./types";
import type { DeviceType } from "./types";

interface DevicePaletteProps {
  onAddDevice: (type: DeviceType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const DEVICE_TYPES: DeviceType[] = [
  "router",
  "switch",
  "hub",
  "pc",
  "server",
  "smartphone",
  "firewall",
  "access-point",
];

export function DevicePalette({
  onAddDevice,
  isOpen,
  onToggle,
}: DevicePaletteProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-20 border-r border-border bg-card shrink-0 overflow-y-auto">
        <div className="p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Devices
          </span>
        </div>
        {DEVICE_TYPES.map((type) => {
          const cfg = DEVICE_CONFIGS[type];
          return (
            <button
              type="button"
              key={type}
              data-ocid={`palette.${type}.button`}
              onClick={() => onAddDevice(type)}
              className="flex flex-col items-center gap-1 p-2 mx-1 mb-1 rounded-lg hover:bg-secondary transition-colors group"
              title={`Adicionar ${cfg.label}`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: cfg.bgColor,
                  border: `1px solid ${cfg.color}33`,
                }}
              >
                <DeviceIcon type={type} size={20} />
              </div>
              <span className="text-[9px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile bottom drawer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
        {isOpen && (
          <div className="bg-card border-t border-border p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DEVICE_TYPES.map((type) => {
                const cfg = DEVICE_CONFIGS[type];
                return (
                  <button
                    type="button"
                    key={type}
                    data-ocid={`palette.mobile.${type}.button`}
                    onClick={() => {
                      onAddDevice(type);
                      onToggle();
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: cfg.bgColor,
                        border: `1px solid ${cfg.color}55`,
                      }}
                    >
                      <DeviceIcon type={type} size={24} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-card border-t border-border flex">
          <button
            type="button"
            data-ocid="palette.toggle"
            onClick={onToggle}
            className="flex-1 py-3 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">{isOpen ? "▼" : "▲"}</span>
            <span>{isOpen ? "Fechar" : "+ Adicionar Dispositivo"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
