// steps/StepMusic.tsx
import MusicRequestManager, {
  type MusicRequestItem,
} from "../MusicRequestManager/MusicRequestManager";

interface Props {
  musicRequest: MusicRequestItem[];
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

export const StepMusic = ({ musicRequest, onChange }: Props) => {
  return (
    <MusicRequestManager
      musicRequests={musicRequest}
      onChange={(updatedList: MusicRequestItem[]) =>
        onChange({
          target: { name: "musicRequest", value: updatedList },
        } as any)
      }
    />
  );
};
