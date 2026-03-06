export interface FormTypeDto {
  /** Stable plugin identifier: always manifest.name. Used as pluginId in form creation. */
  identifier:  string;
  /** Display title: plugin.definition.title ?? manifest.name. */
  title:       string;
  description: string;
  version:     string;
}
