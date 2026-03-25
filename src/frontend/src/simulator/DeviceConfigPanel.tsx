import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DeviceIcon } from "./DeviceIcon";
import type { Device } from "./types";
import { DEVICE_CONFIGS } from "./types";

interface DeviceConfigPanelProps {
  device: Device | null;
  onSave: (updated: Device) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function DeviceConfigPanel({
  device,
  onSave,
  onClose,
  onDelete,
}: DeviceConfigPanelProps) {
  const [form, setForm] = useState<Device | null>(null);

  useEffect(() => {
    setForm(device ? { ...device } : null);
  }, [device]);

  if (!device || !form) return null;

  const cfg = DEVICE_CONFIGS[device.type];

  const update = (field: keyof Device, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = () => {
    if (form) onSave(form);
  };

  return (
    <div
      data-ocid="config.panel"
      className="w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <DeviceIcon type={device.type} size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">{cfg.label}</p>
            <p className="text-[10px] text-muted-foreground">{device.id}</p>
          </div>
        </div>
        <button
          type="button"
          data-ocid="config.close_button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Hostname */}
          <div className="space-y-1">
            <Label className="text-xs">Hostname</Label>
            <Input
              data-ocid="config.input"
              value={form.hostname}
              onChange={(e) => update("hostname", e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* IP */}
          <div className="space-y-1">
            <Label className="text-xs">Endereço IP</Label>
            <Input
              value={form.ip}
              onChange={(e) => update("ip", e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="192.168.1.x"
            />
          </div>

          {/* Subnet */}
          <div className="space-y-1">
            <Label className="text-xs">Máscara de Sub-rede</Label>
            <Input
              value={form.subnetMask}
              onChange={(e) => update("subnetMask", e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="255.255.255.0"
            />
          </div>

          {/* Gateway */}
          <div className="space-y-1">
            <Label className="text-xs">Gateway Padrão</Label>
            <Input
              value={form.gateway}
              onChange={(e) => update("gateway", e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="192.168.1.1"
            />
          </div>

          {/* Interfaces */}
          <div className="space-y-2">
            <Label className="text-xs">
              Interfaces ({cfg.ports.length} portas)
            </Label>
            <div className="space-y-1">
              {cfg.ports.slice(0, 8).map((port) => (
                <div
                  key={port}
                  className="flex items-center justify-between px-2 py-1 rounded bg-secondary text-xs font-mono"
                >
                  <span style={{ color: cfg.color }}>{port}</span>
                  <span className="text-muted-foreground">Up</span>
                </div>
              ))}
              {cfg.ports.length > 8 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{cfg.ports.length - 8} portas
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border flex gap-2">
        <Button
          data-ocid="config.save_button"
          onClick={handleSave}
          size="sm"
          className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
        >
          <Save size={12} className="mr-1" />
          Salvar
        </Button>
        <Button
          data-ocid="config.delete_button"
          onClick={() => onDelete(device.id)}
          size="sm"
          variant="destructive"
          className="px-2"
        >
          Deletar
        </Button>
      </div>
    </div>
  );
}
