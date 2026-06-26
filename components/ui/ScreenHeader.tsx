import { ReactNode } from 'react'
import { View, Text } from 'react-native'
import { RadarLogo } from './RadarLogo'

type Props = {
  title: string
  subtitle?: string
  /** Action pinned to the right (e.g. a distance tag). */
  right?: ReactNode
}

/** Shared tab-screen header: Bindar radar mark + title/subtitle + a right action slot. */
export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View className="px-5 pt-3 pb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 pr-3">
          <RadarLogo size={30} />
          <View className="flex-1">
            <Text className="text-ink text-[26px] font-display-bold leading-tight" numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text className="text-muted text-[13px] font-display mt-0.5" numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {right}
      </View>
    </View>
  )
}
