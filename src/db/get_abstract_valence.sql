select
    abstract.id,
    round(valence::float * 100) as valence,
    pixel_fraction,
    score,
    color_int
from abstract
join abstract_colors
on abstract.id = abstract_colors.abstract_id
order by id asc;
