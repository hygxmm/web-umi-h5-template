# 页面生成器
### 以目录方式生成页面，目录下为页面的组件和样式文件
```shell
$umi g page foo
Write: src/pages/foo.tsx
Write: src/pages/foo.less
```
### 嵌套生成页面
```shell
$umi g page far/far/away/kingdom
Write: src/pages/far/far/away/kingdom.tsx
Write: src/pages/far/far/away/kingdom.less
```
### 批量生成多个页面
```shell
$umi g page  page1  page2   a/nested/page3
Write: src/pages/page1.tsx
Write: src/pages/page1.less
Write: src/pages/page2.tsx
Write: src/pages/page2.less
Write: src/pages/a/nested/page3.tsx
Write: src/pages/a/nested/page3.less
```
# 组件生成器
```shell
$umi g component bar
```