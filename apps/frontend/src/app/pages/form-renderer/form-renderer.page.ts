import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink }  from '@angular/router';
import { Title }                               from '@angular/platform-browser';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { PageWrapperComponent }                from '../../shared/page-wrapper/page-wrapper.component';
import { FormRendererComponent }               from '../../form-renderer/form-renderer.component';

@Component({
  selector: 'app-form-renderer-page',
  standalone: true,
  imports: [PageWrapperComponent, FormRendererComponent, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <app-page-wrapper [title]="pageTitle()">
      <a pageBack matButton routerLink="/">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        Forms
      </a>
      @if (formId()) {
        <app-form-renderer
          [formId]="formId()!"
          (titleLoaded)="onTitleLoaded($event)"
        />
      }
    </app-page-wrapper>
  `,
})
export class FormRendererPage implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly titleService = inject(Title);

  readonly pageTitle = signal('Form');
  readonly formId    = signal<string | null>(null);

  @ViewChild(FormRendererComponent) private renderer?: FormRendererComponent;

  isDirty(): boolean {
    return this.renderer?.isDirty() ?? false;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/']);
        return;
      }
      this.formId.set(id);
    });
  }

  onTitleLoaded(title: string): void {
    this.pageTitle.set(title);
    this.titleService.setTitle(title + ' – FormRig');
  }
}
