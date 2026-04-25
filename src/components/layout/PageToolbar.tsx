import type { ComponentProps } from 'react';
import { TableControlPanel } from '../ui';

export const PageToolbar = (props: ComponentProps<typeof TableControlPanel>) => {
  return <TableControlPanel {...props} />;
};
