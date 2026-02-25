import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PageWrapperComponent } from '../../shared/page-wrapper/page-wrapper.component';
import { FormRendererComponent } from '../../form-renderer/form-renderer.component';

@Component({
  selector: 'app-form-renderer-page',
  standalone: true,
  imports: [PageWrapperComponent, FormRendererComponent],
  template: `
    <app-page-wrapper [title]="pageTitle()">
      <app-form-renderer (titleLoaded)="onTitleLoaded($event)" />
    </app-page-wrapper>
  `,
})
export class FormRendererPage {
  private readonly titleService = inject(Title);

  readonly pageTitle = signal('Form');

  onTitleLoaded(title: string): void {
    this.pageTitle.set(title);
    this.titleService.setTitle(title + ' – FormRig');
  }
}
