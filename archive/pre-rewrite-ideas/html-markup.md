The idea is to create something that could mostly map to LaTeX.

```
<$>for math</$>
<$ class=display arg1 arg2 arg3=3 arg4=4>
display math
</$>

<cite source=""/>
<a name>text</a>
<ref to="" />
```

Latex does not separate semantics from display. So use _IDs_ and _CLASSes_ to do that.

Things a title could have:
- Text
- ID
- Class

Math matrix and array environments.
https://en.wikibooks.org/wiki/LaTeX/Mathematics#Matrices_and_arrays

environment as class. example:

```
<$ class=pmatrix,dislpay>
  a_{1,1} & a_{1,2} & \cdots & a_{1,n} \\
  a_{2,1} & a_{2,2} & \cdots & a_{2,n} \\
  \vdots  & \vdots  & \ddots & \vdots  \\
  a_{m,1} & a_{m,2} & \cdots & a_{m,n} 
</$>
```
Perhaps create optional better method using more modern idea, such as JSON for matrix.


Include AMS package. Perhaps others? Where?

Fine control of counters.

Latex environments
http://latex.wikia.com/wiki/List_of_LaTeX_environments




Bibliography--XML, JSON, YAML
